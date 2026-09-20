<?php
/**
 * Contact form endpoint.
 * Receives the enquiry, validates it server-side, emails it to Stravia and
 * (optionally) sends the enquirer a short acknowledgement.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

require __DIR__ . '/lib/Mailer.php';

/* Anything the visitor may see must read like the company wrote it, not the developer. */
const FALLBACK_CONTACT = 'Please email Hello@stravia.co.in or call +91 88056 76663 and we will come straight back to you.';

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    // Mail credentials not in place yet (or config.php lost in a redeploy).
    error_log('send.php: config.php missing');
    http_response_code(503);
    exit(json_encode(['ok' => false, 'error' => 'Our contact form is not accepting messages just now. ' . FALLBACK_CONTACT]));
}
$cfg = require $configFile;

// timestamps in the notification email should read in the client's timezone, not UTC
date_default_timezone_set($cfg['timezone'] ?? 'Asia/Kolkata');

function fail(int $code, string $msg, array $extra = []): void {
    http_response_code($code);
    exit(json_encode(['ok' => false, 'error' => $msg] + $extra));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Method not allowed.');
}

/* ---------- read input (JSON or normal form post) ---------- */
$raw = file_get_contents('php://input');
$in  = [];
if ($raw && strpos((string)($_SERVER['CONTENT_TYPE'] ?? ''), 'json') !== false) {
    $in = json_decode($raw, true) ?: [];
} else {
    $in = $_POST;
}
$get = fn(string $k, int $max = 200): string => Mailer::clean(mb_substr((string)($in[$k] ?? ''), 0, $max));

/* ---------- bot traps ---------- */
// 1. honeypot: a field hidden from humans; anything in it is a bot
if ($get('website') !== '') {
    exit(json_encode(['ok' => true]));            // pretend success, send nothing
}
// 2. anything submitted implausibly fast is a bot
$elapsed = time() - (int)($in['t'] ?? 0);
if (!empty($cfg['minFillSecs']) && (int)($in['t'] ?? 0) > 0 && $elapsed < (int)$cfg['minFillSecs']) {
    fail(429, 'That was too quick — please try again.');
}

/* ---------- rate limit per IP ---------- */
$ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$dir = __DIR__ . '/storage';
if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
$bucket = $dir . '/rl_' . hash('sha256', $ip) . '.json';
$now    = time();
$hits   = is_file($bucket) ? (json_decode((string)file_get_contents($bucket), true) ?: []) : [];
$hits   = array_values(array_filter($hits, fn($t) => $t > $now - 3600));
if (count($hits) >= (int)($cfg['maxPerHour'] ?? 5)) {
    fail(429, 'Too many messages from this connection. Please try again later.');
}

/* ---------- validate ---------- */
$name    = $get('name', 80);
$email   = $get('email', 120);
$company = $get('company', 100);
$code    = $get('code', 8);
$phone   = $get('phone', 30);
$country = $get('country', 60);
$stage   = $get('stage', 60);
$looking = $get('looking', 80);
// the message goes in the body, not a header, so keep its line breaks —
// just normalise line endings and drop control characters
$message = (string)($in['message'] ?? '');
$message = str_replace(["\r\n", "\r", "\0"], ["\n", "\n", ''], $message);
$message = trim(preg_replace('/\n{3,}/', "\n\n", mb_substr($message, 0, 500)));
$consent = !empty($in['consent']);

$errors = [];
if (mb_strlen($name) < 2)                              { $errors['name']    = 'Please enter your name.'; }
if (!filter_var($email, FILTER_VALIDATE_EMAIL))        { $errors['email']   = 'Enter a valid email address.'; }
if (!preg_match('/^\d{6,14}$/', preg_replace('/\D/', '', $phone))) { $errors['phone'] = 'Enter a valid phone number.'; }
if ($country === '')                                   { $errors['country'] = 'Please choose your country.'; }
if (!$consent)                                         { $errors['consent'] = 'Please accept the Privacy Policy.'; }
if ($errors) {
    fail(422, 'Please check the highlighted fields.', ['fields' => $errors]);
}

/* ---------- compose ---------- */
$rows = [
    'Name'       => $name,
    'Company'    => $company ?: '—',
    'Email'      => $email,
    'Phone'      => trim($code . ' ' . $phone),
    'Country'    => $country,
    'Stage'      => $stage ?: '—',
    'Looking for'=> $looking ?: '—',
];
$e = fn(string $v): string => htmlspecialchars($v, ENT_QUOTES, 'UTF-8');

/* the same summary is used in both emails, so the enquirer sees exactly what Stravia sees */
$summaryHtml = '<table cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-size:14px">';
foreach ($rows as $k => $v) {
    $summaryHtml .= '<tr><td style="color:#5b6875;white-space:nowrap;border-bottom:1px solid #e6ebf2">' . $e($k) . '</td>'
                  . '<td style="font-weight:600;border-bottom:1px solid #e6ebf2">' . $e($v) . '</td></tr>';
}
$summaryHtml .= '</table>';
if ($message !== '') {
    $summaryHtml .= '<p style="color:#5b6875;margin:18px 0 4px">Message</p>'
                  . '<div style="white-space:pre-wrap;border-left:3px solid #3b6ea5;padding:8px 12px;background:#f5f8fc">'
                  . nl2br($e($message)) . '</div>';
}

$summaryText = '';
foreach ($rows as $k => $v) { $summaryText .= str_pad($k . ':', 14) . $v . "\n"; }
if ($message !== '') { $summaryText .= "\nMessage:\n" . $message . "\n"; }

$html  = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2a3a">';
$html .= '<h2 style="margin:0 0 14px;font-size:18px">New enquiry from the Stravia website</h2>';
$html .= $summaryHtml;
$html .= '<p style="color:#8a94a2;font-size:12px;margin-top:20px">Sent ' . date('d M Y, H:i') . ' &middot; IP ' . $e($ip) . '</p></div>';

$text = "New enquiry from the Stravia website\n\n" . $summaryText;

/* ---------- send ---------- */
$mailer = new Mailer($cfg['smtp']);
$sent = $mailer->send(
    $cfg['to'], $cfg['toName'] ?? '',
    'Website enquiry — ' . $name . ($company ? ' (' . $company . ')' : ''),
    $html, $text,
    $email, $name,                     // Reply-To, so replying goes straight to the enquirer
    (array)($cfg['cc'] ?? [])          // copies, e.g. the founder
);

if (!$sent) {
    fail(502, 'We could not send your message right now. ' . FALLBACK_CONTACT,
         ($cfg['debug'] ?? false) ? ['log' => $mailer->log()] : []);
}

/* record the successful send against the rate limit */
$hits[] = $now;
@file_put_contents($bucket, json_encode($hits), LOCK_EX);

/* ---------- acknowledgement to the enquirer ---------- */
$site = rtrim((string)($cfg['siteUrl'] ?? 'https://stravia.co.in'), '/') . '/';
if (!empty($cfg['autoReply'])) {
    $ackHtml = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2a3a">'
        . '<p>Hi ' . $e($name) . ',</p>'
        . '<p>Thanks for getting in touch with Stravia Financial Consulting. We have your enquiry and '
        . 'someone will reply within one business day.</p>'
        . '<p style="color:#5b6875;margin-bottom:6px">For reference, here is what you sent us:</p>'
        . $summaryHtml
        . '<table cellpadding="0" cellspacing="0" style="margin-top:22px;border-top:1px solid #e0e6ef;padding-top:16px"><tr>'
        . '<td style="padding-right:14px;vertical-align:top">'
        . '<img src="' . $site . 'assets/logo-email.png" width="85" height="68" alt="Stravia Financial Consulting" style="display:block;border:0">'
        . '</td><td style="vertical-align:top;font-size:14px;line-height:1.6">'
        . 'Kind regards,<br><strong>Stravia Financial Consulting</strong><br>'
        . '<a href="tel:+918805676663" style="color:#2d5683;text-decoration:none">+91 88056 76663</a><br>'
        . '<a href="' . $site . '" style="color:#2d5683">stravia.co.in</a>'
        . '</td></tr></table></div>';
    $ackText = "Hi $name,\n\nThanks for getting in touch with Stravia Financial Consulting. "
        . "We have your enquiry and someone will reply within one business day.\n\n"
        . "For reference, here is what you sent us:\n\n" . $summaryText . "\n"
        . "Kind regards,\nStravia Financial Consulting\n"
        . "+91 88056 76663\nhttps://stravia.co.in\n";
    (new Mailer($cfg['smtp']))->send($email, $name, 'We received your enquiry — Stravia', $ackHtml, $ackText);
}

echo json_encode(['ok' => true]);
