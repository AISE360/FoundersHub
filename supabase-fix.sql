-- Run this in Supabase SQL editor to fix the signup error
-- It removes the broken trigger that was causing the 500 error

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();
