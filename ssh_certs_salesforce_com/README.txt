https://developer.salesforce.com/blogs/developer-relations/2011/05/generating-valid-self-signed-certificates.html
By Quinton Wall
May 17, 2011

Long story short, more recent versions of Ruby (those greater than 1.8.7) now enforce some
stronger security checks, one of which being the correct verification of the common name of
your certificate. Whilst I bumped up against this change in Ruby and Rails, I suspect many
other languages and web servers will (or do) require valid cnames as part of your
certificates. So, here is a brief list of commands you need to create valid certs for local
development. Note: I am using openssl on a Mac, but I suspect the Java keytool works very
similar.

1. Generate you server key

$ openssl genrsa -des3 -out server.key 1024
You will be prompted for a password for your key. Enter, confirm and continue.



2. Generate your Certificate Signing Request (CSR)

$ openssl req -new -key server.key -out server.csr
You will be prompted again for your key password. Enter the one you created from step 1 above. You can then accept the defaults for all of the prompts you are presented with except the Common Name. This is key, and what makes the enhanced certificate validation happy. Since we are doing local development your common name will be "localhost".

Common Name (eg, YOUR name) []:localhost


3. Generate your Certificate

Lastly we need to create our certificate. Again, use your key password and you will be all set.

$ openssl x509 -req -days 1024 -in server.csr -signkey server.key -out server.crt
