param([string]$Ip)
if (-not $Ip) {
    $enderecos = @([System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) |
        Where-Object { $_.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
            -not [System.Net.IPAddress]::IsLoopback($_) -and -not $_.ToString().StartsWith('169.254.') })
    if ($enderecos.Count -ne 1) {
        throw 'Consulte ipconfig e informe o endereco da rede: gerar-https.ps1 -Ip IP_DA_MAQUINA'
    }
    $Ip = $enderecos[0].ToString()
}
$null = [System.Net.IPAddress]::Parse($Ip)
$ErrorActionPreference = 'Stop'
$webRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$certDir = Join-Path $webRoot '.certs'
New-Item -ItemType Directory -Force -Path $certDir | Out-Null
$rootKey = [System.Security.Cryptography.RSA]::Create(2048)
$hash = [System.Security.Cryptography.HashAlgorithmName]::SHA256
$padding = [System.Security.Cryptography.RSASignaturePadding]::Pkcs1
$rootRequest = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=Cobyte Local Development CA', $rootKey, $hash, $padding)
$rootRequest.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($true, $false, 0, $true))
$rootRequest.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyCertSign -bor [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::CrlSign, $true))
$inicio = [DateTimeOffset]::Now.AddDays(-1)
$rootCert = $rootRequest.CreateSelfSigned($inicio, [DateTimeOffset]::Now.AddYears(2))
$serverKey = [System.Security.Cryptography.RSA]::Create(2048)
$request = [System.Security.Cryptography.X509Certificates.CertificateRequest]::new('CN=Cobyte Local Development', $serverKey, $hash, $padding)
$request.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509BasicConstraintsExtension]::new($false, $false, 0, $true))
$request.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509KeyUsageExtension]::new([System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::DigitalSignature -bor [System.Security.Cryptography.X509Certificates.X509KeyUsageFlags]::KeyEncipherment, $true))
$usos = [System.Security.Cryptography.OidCollection]::new()
$usos.Add([System.Security.Cryptography.Oid]::new('1.3.6.1.5.5.7.3.1')) | Out-Null
$request.CertificateExtensions.Add([System.Security.Cryptography.X509Certificates.X509EnhancedKeyUsageExtension]::new($usos, $false))
$san = [System.Security.Cryptography.X509Certificates.SubjectAlternativeNameBuilder]::new()
$san.AddDnsName('localhost')
$san.AddIpAddress([System.Net.IPAddress]::Loopback)
$san.AddIpAddress([System.Net.IPAddress]::Parse($Ip))
$request.CertificateExtensions.Add($san.Build())
$serial = [System.Security.Cryptography.RandomNumberGenerator]::GetBytes(16)
$serverCert = $request.Create($rootCert, $inicio, [DateTimeOffset]::Now.AddDays(180), $serial)
[System.IO.File]::WriteAllText((Join-Path $certDir 'server-key.pem'), $serverKey.ExportRSAPrivateKeyPem())
[System.IO.File]::WriteAllText((Join-Path $certDir 'server-cert.pem'), $serverCert.ExportCertificatePem())
[System.IO.File]::WriteAllText((Join-Path $certDir 'ca-cert.pem'), $rootCert.ExportCertificatePem())
[System.IO.File]::WriteAllBytes((Join-Path $webRoot 'public/cobyte-local-ca.cer'), $rootCert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Cert))
$serverCert.Dispose()
$rootCert.Dispose()
$serverKey.Dispose()
$rootKey.Dispose()
Write-Output "Certificado local criado para $Ip. Instale public/cobyte-local-ca.cer no celular."
