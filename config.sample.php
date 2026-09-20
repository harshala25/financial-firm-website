<?php
/**
 * Copy this file to config.php and fill in the real values.
 * config.php is git-ignored so credentials never reach the repository.
 *
 * GoDaddy shared hosting BLOCKS all outbound SMTP — smtp.office365.com,
 * smtpout.secureserver.net and relay-hosting.secureserver.net all time out
 * (verified on the Singapore server, Sep 2026). The only route that works is
 * the server's own Exim on localhost:25, which needs no username or password:
 *
 *   'host' => 'localhost', 'port' => 25, 'secure' => '', username/password ''
 *
 * Two things this depends on:
 *   1. The domain's SPF record must include GoDaddy, or Microsoft 365 will
 *      treat the mail as spoofed:  include:secureserver.net
 *   2. cPanel > Email Routing for stravia.co.in must be set to REMOTE mail
 *      exchanger, otherwise Exim delivers Hello@stravia.co.in to a local
 *      mailbox on this server instead of to Microsoft 365, and it vanishes.
 *
 * Leave 'host' empty to fall back to PHP's built-in mail() instead.
 */
return [
    'smtp' => [
        'host'     => 'localhost',             // GoDaddy blocks every external SMTP host
        'port'     => 25,
        'secure'   => '',                      // 'tls' (587) | 'ssl' (465) | '' (25)
        'username' => '',                      // local Exim needs no authentication
        'password' => '',
        'from'     => 'Hello@stravia.co.in',   // must be a mailbox you control
        'fromName' => 'Stravia',
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
