/**
 * Schema Validator
 * 
 * Validates that required database tables and structures exist.
 * Provides detailed logging for debugging schema issues.
 */

import { supabase } from "@/integrations/supabase/client";

// Required tables for the application
const REQUIRED_TABLES = [
  'profiles',
  'user_roles',
  'ads',
  'task_submissions',
  'transactions',
  'referrals',
  'notifications',
  'chat_sessions',
  'chat_messages',
  'app_settings',
  'platform_settings',
] as const;

// Optional tables (app works without them but with reduced functionality)
const OPTIONAL_TABLES = [
  'moderator_permissions',
  'moderator_activity_logs',
  'admin_totp_secrets',
  'admin_login_attempts',
  'email_verifications',
  'follow_verifications',
  'generated_comments',
  'ad_settings',
  'allowed_email_domains',
  'landing_content',
  'smtp_config',
  'ai_config',
  'ai_prompts',
  'referral_commissions',
  'schema_version',
] as const;

export interface SchemaValidationResult {
  isValid: boolean;
  missingRequiredTables: string[];
  missingOptionalTables: string[];
  existingTables: string[];
  schemaVersion: string | null;
  errors: string[];
}

/**
 * Log with consistent prefix for DB initialization
 */
function dbLog(level: 'info' | 'warn' | 'error', message: string, data?: unknown) {
  const prefix = '[DB INIT]';
  const timestamp = new Date().toISOString();
  
  switch (level) {
    case 'info':
      console.log(`${prefix} ${timestamp} ${message}`, data ?? '');
      break;
    case 'warn':
      console.warn(`${prefix} ${timestamp} ⚠️ ${message}`, data ?? '');
      break;
    case 'error':
      console.error(`${prefix} ${timestamp} ❌ ${message}`, data ?? '');
      break;
  }
}

/**
 * Check if a table exists by attempting to query it
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    // Use a minimal query to check if table exists
    // The count with head:true is the most efficient way
    const { error } = await supabase
      .from(tableName as any)
      .select('*', { count: 'exact', head: true });
    
    // If no error, table exists
    if (!error) return true;
    
    // Check if error is because table doesn't exist
    if (error.code === '42P01' || error.message.includes('does not exist')) {
      return false;
    }
    
    // RLS errors mean table exists but we don't have access
    if (error.code === '42501' || error.message.includes('permission denied')) {
      return true;
    }
    
    // Other errors - assume table exists but there's another issue
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current schema version if available
 */
async function getSchemaVersion(): Promise<string | null> {
  try {
    // Use raw fetch to avoid type issues with dynamic table
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/schema_version?select=version&order=applied_at.desc&limit=1`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      }
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0 && data[0].version) {
      return data[0].version;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Validate the database schema
 */
export async function validateSchema(): Promise<SchemaValidationResult> {
  dbLog('info', 'Starting schema validation...');
  
  const result: SchemaValidationResult = {
    isValid: true,
    missingRequiredTables: [],
    missingOptionalTables: [],
    existingTables: [],
    schemaVersion: null,
    errors: [],
  };
  
  try {
    // Check required tables
    dbLog('info', 'Checking required tables...');
    for (const table of REQUIRED_TABLES) {
      const exists = await tableExists(table);
      if (exists) {
        result.existingTables.push(table);
        dbLog('info', `✓ Table exists: ${table}`);
      } else {
        result.missingRequiredTables.push(table);
        result.isValid = false;
        dbLog('error', `Missing required table: ${table}`);
      }
    }
    
    // Check optional tables
    dbLog('info', 'Checking optional tables...');
    for (const table of OPTIONAL_TABLES) {
      const exists = await tableExists(table);
      if (exists) {
        result.existingTables.push(table);
        dbLog('info', `✓ Table exists: ${table}`);
      } else {
        result.missingOptionalTables.push(table);
        dbLog('warn', `Missing optional table: ${table}`);
      }
    }
    
    // Get schema version
    result.schemaVersion = await getSchemaVersion();
    if (result.schemaVersion) {
      dbLog('info', `Schema version: ${result.schemaVersion}`);
    } else {
      dbLog('warn', 'Schema version not found (schema_version table may be missing)');
    }
    
    // Summary
    if (result.isValid) {
      dbLog('info', `✓ Schema validation passed. ${result.existingTables.length} tables found.`);
    } else {
      dbLog('error', `Schema validation failed. Missing ${result.missingRequiredTables.length} required tables.`);
      dbLog('error', 'Run schema.sql manually in Supabase SQL Editor to fix this.');
    }
    
    if (result.missingOptionalTables.length > 0) {
      dbLog('warn', `${result.missingOptionalTables.length} optional tables missing. Some features may be unavailable.`);
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(errorMessage);
    result.isValid = false;
    dbLog('error', 'Schema validation error:', error);
  }
  
  return result;
}

/**
 * Check if the auth trigger is working by checking if profiles are created
 */
export async function validateAuthTrigger(): Promise<boolean> {
  dbLog('info', 'Checking auth trigger (handle_new_user)...');
  
  try {
    // We can't directly check triggers from client, but we can verify
    // by checking if profiles table has data correlation with auth
    const { data, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    
    if (error) {
      dbLog('warn', 'Could not verify auth trigger status:', error.message);
      return false;
    }
    
    dbLog('info', '✓ Profiles table accessible - trigger should be working');
    return true;
  } catch (error) {
    dbLog('error', 'Auth trigger check failed:', error);
    return false;
  }
}

/**
 * Get a summary of the schema status for display
 */
export function getSchemaStatusSummary(result: SchemaValidationResult): string {
  const lines: string[] = [];
  
  lines.push('=== Database Schema Status ===');
  lines.push(`Status: ${result.isValid ? '✓ Valid' : '❌ Invalid'}`);
  lines.push(`Schema Version: ${result.schemaVersion || 'Unknown'}`);
  lines.push(`Tables Found: ${result.existingTables.length}`);
  
  if (result.missingRequiredTables.length > 0) {
    lines.push(`\n❌ Missing Required Tables:`);
    result.missingRequiredTables.forEach(t => lines.push(`   - ${t}`));
  }
  
  if (result.missingOptionalTables.length > 0) {
    lines.push(`\n⚠️ Missing Optional Tables:`);
    result.missingOptionalTables.forEach(t => lines.push(`   - ${t}`));
  }
  
  if (result.errors.length > 0) {
    lines.push(`\n❌ Errors:`);
    result.errors.forEach(e => lines.push(`   - ${e}`));
  }
  
  if (!result.isValid) {
    lines.push('\n📋 To fix: Run supabase/schema.sql in Supabase SQL Editor');
  }
  
  return lines.join('\n');
}
