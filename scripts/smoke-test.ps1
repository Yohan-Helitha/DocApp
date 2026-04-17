param(
  [string]$BaseUrl = 'http://localhost:18080',
  [string]$AdminEmail = 'admin1@example.com',
  [string]$AdminPassword = 'Password123',
  [string]$PatientEmail = 'patient2@example.com',
  [string]$PatientPassword = 'Password123'
)

$ErrorActionPreference = 'Stop'

function Convert-FromBase64Url([string]$b64u) {
  $s = $b64u.Replace('-', '+').Replace('_', '/')
  switch ($s.Length % 4) {
    2 { $s += '==' }
    3 { $s += '=' }
    default { }
  }
  $bytes = [Convert]::FromBase64String($s)
  [Text.Encoding]::UTF8.GetString($bytes)
}

function Write-Step([string]$title) {
  Write-Host "\n=== $title ===" -ForegroundColor Cyan
}

function Invoke-Json([string]$Method, [string]$Url, [object]$Body = $null, [hashtable]$Headers = $null) {
  $params = @{
    Uri = $Url
    Method = $Method
    UseBasicParsing = $true
  }

  if ($Headers) { $params.Headers = $Headers }

  if ($null -ne $Body) {
    $params.ContentType = 'application/json'
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }

  $res = Invoke-WebRequest @params
  if ($res.Content) {
    try { return ($res.Content | ConvertFrom-Json) } catch { }
  }
  return $res.Content
}

Write-Step 'Precheck'
Write-Host "BaseUrl: $BaseUrl"
Write-Host 'Tip: start port-forward in another terminal:'
Write-Host '  kubectl port-forward svc/api-gateway 18080:4000'

Write-Step 'Gateway health'
$health = Invoke-Json -Method GET -Url "$BaseUrl/health"
$health | ConvertTo-Json -Depth 6

Write-Step 'Admin login'
$adminTokens = Invoke-Json -Method POST -Url "$BaseUrl/api/v1/auth/login" -Body @{ email = $AdminEmail; password = $AdminPassword }
if (-not $adminTokens.accessToken) { throw 'Admin login did not return accessToken' }
$adminToken = [string]$adminTokens.accessToken
Write-Host ("Admin accessToken length: {0}" -f $adminToken.Length)

Write-Step 'Admin transactions list'
$adminTx = Invoke-Json -Method GET -Url "$BaseUrl/api/v1/admin/transactions" -Headers @{ Authorization = "Bearer $adminToken" }
$txCount = @($adminTx.transactions).Count
Write-Host "transactions.count: $txCount"

Write-Step 'Initiate payment (creates pending admin tx best-effort)'
$appointmentId = [System.Guid]::NewGuid().ToString()
$patientId = [System.Guid]::NewGuid().ToString()
$init = Invoke-Json -Method POST -Url "$BaseUrl/api/v1/payments/initiate" -Body @{ appointmentId = $appointmentId; patientId = $patientId; amount = 1234.56; currency = 'LKR' }
if (-not $init.paymentId) { throw 'Payment initiate did not return paymentId' }
$paymentId = [string]$init.paymentId
Write-Host "paymentId: $paymentId"

Write-Step 'Verify payment status'
$payment = Invoke-Json -Method GET -Url "$BaseUrl/api/v1/payments/$paymentId"
Write-Host ("payment_status: {0}" -f $payment.payment.payment_status)

Write-Step 'Verify payment exists in admin transactions'
$adminTx2 = Invoke-Json -Method GET -Url "$BaseUrl/api/v1/admin/transactions" -Headers @{ Authorization = "Bearer $adminToken" }
$found = @($adminTx2.transactions | Where-Object { $_.transaction_id -eq $paymentId })
Write-Host "adminRowsFoundForPayment: $($found.Count)"
if ($found.Count -gt 0) {
  Write-Host "adminStatus: $($found[0].status)"
}

Write-Step 'Patient login'
$patientTokens = Invoke-Json -Method POST -Url "$BaseUrl/api/v1/auth/login" -Body @{ email = $PatientEmail; password = $PatientPassword }
if (-not $patientTokens.accessToken) { throw 'Patient login did not return accessToken' }
$patientToken = [string]$patientTokens.accessToken

$payloadJson = Convert-FromBase64Url ($patientToken.Split('.')[1])
$payload = $payloadJson | ConvertFrom-Json
$userId = [string]$payload.sub
Write-Host "patient.userId: $userId"

Write-Step 'Send PAYMENT_SUCCESS templated notification (creates in-app record)'
$notifyRes = Invoke-Json -Method POST -Url "$BaseUrl/api/v1/notifications/send-email" -Headers @{ Authorization = "Bearer $patientToken" } -Body @{
  recipient_user_id = $userId
  recipient_email = $PatientEmail
  channel = 'email'
  template_code = 'PAYMENT_SUCCESS'
  message = 'Smoke test: payment success'
  payload_json = @{ subject = 'Payment confirmed'; appointmentId = $appointmentId }
}
$notifyRes | Out-Null
Write-Host 'notification: created'

Write-Step 'List patient notifications'
$notificationsRes = Invoke-Json -Method GET -Url "$BaseUrl/api/v1/notifications/user/$userId" -Headers @{ Authorization = "Bearer $patientToken" }
$matches = @($notificationsRes.notifications | Where-Object { $_.template_code -eq 'PAYMENT_SUCCESS' })
Write-Host "payment_success_notifications_found: $($matches.Count)"
if ($matches.Count -gt 0) {
  Write-Host "latest.channel: $($matches[0].channel)"
}

Write-Host "\nSmoke test completed." -ForegroundColor Green
