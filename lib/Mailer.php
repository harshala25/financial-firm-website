<?php
/**
 * Minimal SMTP client for the Stravia contact form.
 *
 * Written for this project rather than pulling in a library: PHPMailer is LGPL-2.1,
 * and Symfony Mailer needs Composer, which is awkward on GoDaddy shared hosting.
 * This has no third-party dependencies — just PHP's sockets and openssl.
 *
 * Supports STARTTLS (587), implicit TLS (465), plain (25) and AUTH LOGIN / PLAIN.
 */

class Mailer
{
    private $cfg;
    private $sock;
    private $log = [];

    public function __construct(array $cfg)
    {
        $this->cfg = $cfg;
    }

    public function log(): array
    {
        return $this->log;
    }

    /** Strip anything that could inject extra headers. */
    public static function clean(string $v): string
    {
        return trim(str_replace(["\r", "\n", "\0"], ' ', $v));
    }

    public function send(string $toEmail, string $toName, string $subject, string $html, string $text, string $replyTo = '', string $replyToName = '', array $cc = []): bool
    {
        $c = $this->cfg;

        // No SMTP host configured: fall back to PHP's mail(), which works on most
        // shared hosts but has weaker deliverability.
        if (empty($c['host'])) {
            return $this->viaMailFunction($toEmail, $subject, $html, $text, $replyTo, $replyToName);
        }

        $boundary = 'b' . bin2hex(random_bytes(12));
        $headers  = $this->buildHeaders($toEmail, $toName, $subject, $replyTo, $replyToName, $boundary, $cc);
        $body     = $this->buildBody($html, $text, $boundary);

        try {
            $this->connect();
            $this->cmd('EHLO ' . $this->heloName(), [250]);

            if ($c['secure'] === 'tls') {
                $this->cmd('STARTTLS', [220]);
                $ok = stream_socket_enable_crypto($this->sock, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                if (!$ok) {
                    throw new RuntimeException('STARTTLS negotiation failed');
                }
                $this->cmd('EHLO ' . $this->heloName(), [250]);
            }

            if (!empty($c['username'])) {
                $this->authenticate($c['username'], $c['password']);
            }

            $this->cmd('MAIL FROM:<' . $c['from'] . '>', [250]);
            $this->cmd('RCPT TO:<' . $toEmail . '>', [250, 251]);
            foreach ($cc as $addr) {                       // copies are separate envelope recipients
                $this->cmd('RCPT TO:<' . self::clean($addr) . '>', [250, 251]);
            }
            $this->cmd('DATA', [354]);

            // dot-stuffing, per RFC 5321
            $data = $headers . "\r\n" . $body;
            $data = preg_replace('/^\./m', '..', $data);
            $this->write($data . "\r\n.");
            $this->expect([250]);

            $this->cmd('QUIT', [221], true);
            $this->close();
            return true;
        } catch (Throwable $e) {
            $this->log[] = 'ERROR: ' . $e->getMessage();
            $this->close();
            return false;
        }
    }

    private function heloName(): string
    {
        $h = $_SERVER['SERVER_NAME'] ?? 'localhost';
        return preg_match('/^[A-Za-z0-9.\-]+$/', $h) ? $h : 'localhost';
    }

    private function connect(): void
    {
        $c    = $this->cfg;
        $host = ($c['secure'] === 'ssl' ? 'ssl://' : '') . $c['host'];
        $ctx  = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);

        $this->sock = @stream_socket_client(
            $host . ':' . $c['port'], $errno, $errstr,
            $c['timeout'] ?? 15, STREAM_CLIENT_CONNECT, $ctx
        );
        if (!$this->sock) {
            throw new RuntimeException("connect to {$c['host']}:{$c['port']} failed ($errno $errstr)");
        }
        stream_set_timeout($this->sock, $c['timeout'] ?? 15);
        $this->expect([220]);
    }

    private function authenticate(string $user, string $pass): void
    {
        // AUTH LOGIN is the most widely supported on shared hosts
        $this->cmd('AUTH LOGIN', [334]);
        $this->cmd(base64_encode($user), [334]);
        $this->cmd(base64_encode($pass), [235]);
    }

    private function cmd(string $line, array $expect, bool $ignoreReply = false): void
    {
        $this->write($line);
        if (!$ignoreReply) {
            $this->expect($expect);
        }
    }

    private function write(string $line): void
    {
        $safe = preg_match('/^(AUTH|[A-Za-z0-9+\/=]{12,})/', $line) ? '[redacted]' : $line;
        $this->log[] = '> ' . substr($safe, 0, 120);
        fwrite($this->sock, $line . "\r\n");
    }

    private function expect(array $codes): string
    {
        $reply = '';
        while ($line = fgets($this->sock, 1024)) {
            $reply .= $line;
            // multiline replies look like "250-..."; the last one is "250 ..."
            if (strlen($line) < 4 || $line[3] !== '-') {
                break;
            }
        }
        $this->log[] = '< ' . trim(substr($reply, 0, 200));
        $code = (int) substr(trim($reply), 0, 3);
        if (!in_array($code, $codes, true)) {
            throw new RuntimeException('unexpected reply: ' . trim($reply));
        }
        return $reply;
    }

    private function close(): void
    {
        if ($this->sock) {
            @fclose($this->sock);
            $this->sock = null;
        }
    }

    private function buildHeaders(string $toEmail, string $toName, string $subject, string $replyTo, string $replyToName, string $boundary, array $cc = []): string
    {
        $c = $this->cfg;
        $h = [];
        $h[] = 'Date: ' . date('r');
        $h[] = 'From: ' . $this->addr($c['from'], $c['fromName']);
        $h[] = 'To: ' . $this->addr($toEmail, $toName);
        if ($cc) {
            $h[] = 'Cc: ' . implode(', ', array_map(fn($a) => self::clean($a), $cc));
        }
        if ($replyTo) {
            $h[] = 'Reply-To: ' . $this->addr($replyTo, $replyToName);
        }
        $h[] = 'Subject: ' . $this->encodeHeader($subject);
        $h[] = 'Message-ID: <' . bin2hex(random_bytes(10)) . '@' . $this->heloName() . '>';
        $h[] = 'MIME-Version: 1.0';
        $h[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';
        return implode("\r\n", $h) . "\r\n";
    }

    private function buildBody(string $html, string $text, string $boundary): string
    {
        $b  = "--$boundary\r\n";
        $b .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $b .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $b .= chunk_split(base64_encode($text)) . "\r\n";
        $b .= "--$boundary\r\n";
        $b .= "Content-Type: text/html; charset=UTF-8\r\n";
        $b .= "Content-Transfer-Encoding: base64\r\n\r\n";
        $b .= chunk_split(base64_encode($html)) . "\r\n";
        $b .= "--$boundary--\r\n";
        return $b;
    }

    private function addr(string $email, string $name): string
    {
        $email = self::clean($email);
        $name  = self::clean($name);
        return $name ? $this->encodeHeader($name) . ' <' . $email . '>' : $email;
    }

    private function encodeHeader(string $v): string
    {
        $v = self::clean($v);
        return preg_match('/[^\x20-\x7E]/', $v)
            ? '=?UTF-8?B?' . base64_encode($v) . '?='
            : $v;
    }

    private function viaMailFunction(string $to, string $subject, string $html, string $text, string $replyTo, string $replyToName): bool
    {
        $c = $this->cfg;
        $boundary = 'b' . bin2hex(random_bytes(12));
        $headers  = [
            'From: ' . $this->addr($c['from'], $c['fromName']),
            'MIME-Version: 1.0',
            'Content-Type: multipart/alternative; boundary="' . $boundary . '"',
        ];
        if ($replyTo) {
            $headers[] = 'Reply-To: ' . $this->addr($replyTo, $replyToName);
        }
        $this->log[] = '> using PHP mail() fallback (no SMTP host configured)';
        return @mail($to, $this->encodeHeader($subject), $this->buildBody($html, $text, $boundary), implode("\r\n", $headers));
    }
}
