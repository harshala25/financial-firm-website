<?php
/**
 * Copy this file to config.php and fill in the real values.
 * config.php is git-ignored so credentials never reach the repository.
 *
 * On GoDaddy cPanel hosting, the mailbox for the domain is usually reachable at:
 *   host 'smtpout.secureserver.net', port 587, secure 'tls'
 * If email for stravia.co.in is on Microsoft 365 instead:
 *   host 'smtp.office365.com',       port 587, secure 'tls'
 * Leave 'host' empty to fall back to PHP's built-in mail().
 */
return [
    'smtp' => [
        'host'     => '',                      // e.g. 'smtpout.secureserver.net'
        'port'     => 587,
        'secure'   => 'tls',                   // 'tls' (587) | 'ssl' (465) | '' (25)
        'username' => '',                      // the full mailbox address
        'password' => '',
        'from'     => 'Hello@stravia.co.in',   // must be a mailbox you control
        'fromName' => 'Stravia Website',
        'timeout'  => 15,
    ],

    'siteUrl'  => 'https://stravia.co.in',   // used for the logo and link in the auto-reply
    'timezone' => 'Asia/Kolkata',

    // Where enquiries land.
    'to'      => 'Hello@stravia.co.in',
    'cc'      => ['Kaushal.pawar@stravia.co.in'],
    'toName'  => 'Stravia',

    // Send the enquirer a short acknowledgement too.
    'autoReply' => true,

    // Basic abuse control.
    'maxPerHour'   => 5,       // submissions allowed per IP per hour
    'minFillSecs'  => 3,       // a form completed faster than this is a bot

    // Set true only while debugging; it returns the SMTP transcript to the browser.
    'debug' => false,
];
