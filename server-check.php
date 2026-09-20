<?php
/**
 * TEMPORARY diagnostic — upload to public_html, open in a browser, then DELETE IT.
 * Tells us everything we need to know about the host in one page.
 * Contains no passwords and sends no mail.
 */
header('Content-Type: text/html; charset=utf-8');

function row(string $label, bool $ok, string $detail = ''): string {
    $mark  = $ok ? '&#10003;' : '&#10007;';
    $color = $ok ? '#1c6b3f' : '#9b2c2c';
    return '<tr><td>' . htmlspecialchars($label) . '</td>'
         . '<td style="color:' . $color . ';font-weight:700;text-align:center">' . $mark . '</td>'
         . '<td style="color:#5b6875">' . htmlspecialchars($detail) . '</td></tr>';
}

/* --- PHP itself --- */
$rows  = '';
$rows .= row('PHP 7.4 or newer', version_compare(PHP_VERSION, '7.4', '>='), 'running ' . PHP_VERSION);
foreach (['mbstring', 'openssl', 'filter'] as $ext) {
    $rows .= row("Extension: $ext", extension_loaded($ext));
}
$sw = (string)($_SERVER['SERVER_SOFTWARE'] ?? 'unknown');
$rows .= row('Web server (Apache/LiteSpeed = .htaccess works)',
    (bool)preg_match('/apache|litespeed/i', $sw), $sw);

/* --- can we write the rate-limit folder? --- */
$dir = __DIR__ . '/storage';
if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
$probe = $dir . '/_probe.tmp';
$canWrite = @file_put_contents($probe, 'x') !== false;
@unlink($probe);
$rows .= row('storage/ is writable', $canWrite, $dir);

/* --- the important one: can this server reach a mail server? --- */
$targets = [
    'Microsoft 365'        => ['smtp.office365.com', 587],
    'Microsoft 365 (SSL)'  => ['smtp.office365.com', 465],
    'GoDaddy relay'        => ['relay-hosting.secureserver.net', 25],
    'GoDaddy SMTP'         => ['smtpout.secureserver.net', 465],
    'Localhost mail'       => ['localhost', 25],
];
$smtp = '';
foreach ($targets as $name => [$host, $port]) {
    $t0 = microtime(true);
    $fp = @fsockopen($host, $port, $errno, $errstr, 8);
    $ms = round((microtime(true) - $t0) * 1000);
    if ($fp) {
        $banner = trim((string)@fgets($fp, 256));
        @fclose($fp);
        $smtp .= row("$name  ($host:$port)", true, "{$ms}ms  " . substr($banner, 0, 60));
    } else {
        $smtp .= row("$name  ($host:$port)", false, "{$ms}ms  $errstr");
    }
}

/* --- does PHP's own mail() exist? --- */
$rows .= row('mail() available', function_exists('mail') && !in_array('mail', explode(',', str_replace(' ', '', (string)ini_get('disable_functions'))), true));

echo '<!DOCTYPE html><meta charset="utf-8"><title>Server check</title>'
   . '<style>body{font:14px/1.6 -apple-system,Segoe UI,sans-serif;max-width:760px;margin:40px auto;padding:0 20px;color:#1f2a3a}'
   . 'h1{font-size:21px}h2{font-size:16px;margin-top:30px}'
   . 'table{border-collapse:collapse;width:100%}td{padding:7px 10px;border-bottom:1px solid #e0e6ef}'
   . 'td:nth-child(2){width:40px}.warn{background:#fdf6ec;border:1px solid #f0dcbd;padding:12px 15px;border-radius:8px;margin-top:26px}</style>'
   . '<h1>Stravia — server check</h1>'
   . '<h2>PHP and files</h2><table>' . $rows . '</table>'
   . '<h2>Outbound mail connections</h2><table>' . $smtp . '</table>'
   . '<div class="warn"><strong>Delete this file when you are done.</strong> '
   . 'It exposes server details that should not stay public.</div>';
