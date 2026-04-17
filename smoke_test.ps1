$ErrorActionPreference = 'Stop'
$base = 'http://localhost:18080'
$adminLoginBody = @{ email = 'admin1@example.com'; password = 'Password123' } | ConvertTo-Json
$adminLogin = Invoke-WebRequest "$base/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $adminLoginBody -UseBasicParsing
$adminToken = (($adminLogin.Content | ConvertFrom-Json).accessToken)
$aptId = [System.Guid]::NewGuid().ToString()
$patId = [System.Guid]::NewGuid().ToString()
$payBody = @{ appointmentId = $aptId; patientId = $patId; amount = 1234.56; currency = 'LKR' } | ConvertTo-Json
$initRes = Invoke-WebRequest "$base/api/v1/payments/initiate" -Method Post -ContentType 'application/json' -Body $payBody -UseBasicParsing
$paymentId = (($initRes.Content | ConvertFrom-Json).paymentId)
$txRes = Invoke-WebRequest "$base/api/v1/admin/transactions" -Headers @{ Authorization = "Bearer $adminToken" } -UseBasicParsing
$tx = $txRes.Content | ConvertFrom-Json
$found = @($tx.transactions | Where-Object { $_.transaction_id -eq $paymentId })
Write-Output "paymentId: $paymentId"
Write-Output "adminRowsFound: $($found.Count)"
if ($found.Count -gt 0) { Write-Output "adminStatus: $($found[0].status)" }
$patientLoginBody = @{ email = 'patient2@example.com'; password = 'Password123' } | ConvertTo-Json
$patientLogin = Invoke-WebRequest "$base/api/v1/auth/login" -Method Post -ContentType 'application/json' -Body $patientLoginBody -UseBasicParsing
$patientToken = (($patientLogin.Content | ConvertFrom-Json).accessToken)
function Convert-FromBase64Url([string]$b64u) {
  $s = $b64u.Replace('-', '+').Replace('_', '/')
  switch ($s.Length % 4) { 2 { $s += '==' } 3 { $s += '=' } 0 { } default { } }
  $bytes = [Convert]::FromBase64String($s)
  [Text.Encoding]::UTF8.GetString($bytes)
}
$payloadJson = Convert-FromBase64Url ($patientToken.Split('.')[1])
$payload = $payloadJson | ConvertFrom-Json
$userId = $payload.sub
$notifyBody = @{ 
  recipient_user_id = $userId;
  recipient_email = 'patient2@example.com';
  channel = 'email';
  template_code = 'PAYMENT_SUCCESS';
  message = 'Smoke test: payment success';
  payload_json = @{ subject = 'Payment confirmed'; appointmentId = $aptId }
} | ConvertTo-Json -Depth 5
$notifyRes = Invoke-WebRequest "$base/api/v1/notifications/send-email" -Method Post -ContentType 'application/json' -Headers @{ Authorization = "Bearer $patientToken" } -Body $notifyBody -UseBasicParsing
Write-Output "Notification status: $($notifyRes.StatusCode)"
$notifRes = Invoke-WebRequest "$base/api/v1/notifications/user/$userId" -Headers @{ Authorization = "Bearer $patientToken" } -UseBasicParsing
$notifications = ($notifRes.Content | ConvertFrom-Json).notifications
$matches = @($notifications | Where-Object { $_.template_code -eq 'PAYMENT_SUCCESS' })
Write-Output "userId: $userId"
Write-Output "payment_success_notifications_found: $($matches.Count)"
if ($matches.Count -gt 0) { Write-Output "latest_channel: $($matches[0].channel)" }
