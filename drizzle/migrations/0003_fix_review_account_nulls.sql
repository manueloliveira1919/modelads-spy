UPDATE auth.users SET
  email_change = coalesce(email_change,''),
  email_change_token_new = coalesce(email_change_token_new,''),
  email_change_token_current = coalesce(email_change_token_current,''),
  phone_change_token = coalesce(phone_change_token,''),
  reauthentication_token = coalesce(reauthentication_token,''),
  confirmation_token = coalesce(confirmation_token,''),
  recovery_token = coalesce(recovery_token,'')
WHERE email = 'meta-review@modelads.com.br';