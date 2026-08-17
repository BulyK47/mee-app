# Security Policy

This is a course application with **no server, no accounts and no data collection**: it runs
entirely on the device and PRIVACY.md lists everything it stores there. That removes most of what a
security policy usually covers, and leaves three things it does cover — the published artifacts, the
dependency chain they are built from, and the key they are signed with.

## Supported versions

Only the current release. There are no maintained branches: the app ships as a single build to
Google Play and to a web address, and a fix means a new build in both places.

## Reporting

**Do not open a public issue for a security problem.** Two private channels, either is fine:

- GitHub → **Security → Report a vulnerability** (private advisory, preferred: it keeps the
  discussion, the fix and the disclosure in one place)
- e-mail **dmaecseb108@gmail.com**, subject starting with `SECURITY`

Please include what you did, what happened, and which build (where you installed it from, and
roughly when). A proof of concept is welcome; a scanner's raw output without a reproduction usually
is not.

### What to expect

This is maintained by lecturers alongside teaching. Expect an acknowledgement within about a week,
and slower during the exam session. There is no bug bounty, and there is no legal threat either: a
report made in good faith through the channels above is welcome, including one that turns out to be
wrong.

## In scope

- The published application: the Play build, and the build served on the web.
- This repository: the build scripts, the service worker, the figure and formula renderers.
  Anything that turns exercise data into markup is the interesting part — the app draws figures and
  typesets MathML from content, and that is the only path where data becomes structure.
- Dependencies, as bundled: if a package this app ships has an advisory that actually reaches the
  browser, that is in scope.
- **The release signing key.** If you have reason to believe the Android signing key or a published
  artifact has been tampered with, say so first and in detail — it is the highest-severity report
  this project can receive.

## Not a vulnerability

- **The item bank is inside the compiled application.** It has to be: the app grades offline, with
  no network and no account. Client-side grading is not an access control and is not claimed to be
  one — see NOTICE. Withholding the source is about what is licensed and searchable, not about a
  secret. Extracting it from a bundle you installed is not a finding, and reporting it as one in
  public would mainly be a tutorial.
- **Progress is stored unencrypted in the browser's local storage.** By design, documented in
  PRIVACY.md. There is nothing personal in it, and a device where another program can read it is a
  device where this app is not the problem.
- **The web address is not indexed but is not secret.** robots.txt asks search engines to stay away;
  it is not access control, and nothing on that address is treated as confidential.
- **No Content-Security-Policy header on a statically hosted page**, missing security headers on the
  host, and similar scanner output, unless you can show what it lets you do here.
