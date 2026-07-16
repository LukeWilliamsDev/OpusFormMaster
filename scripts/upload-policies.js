import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'policies';
const POLICIES_DIR = path.resolve(__dirname, '../policies');

async function main() {
  console.log(`Reading policies from ${POLICIES_DIR}...`);
  const files = fs.readdirSync(POLICIES_DIR).filter(file => file.endsWith('.pdf'));
  
  for (const file of files) {
    const filePath = path.join(POLICIES_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    
    console.log(`Uploading ${file}...`);
    const { data, error } = await supabase.storage.from(BUCKET_NAME).upload(file, fileBuffer, {
      contentType: 'application/pdf',
      upsert: true
    });
    
    if (error) {
      console.error(`Error uploading ${file}:`, error);
    } else {
      console.log(`Successfully uploaded ${file}`);
    }
  }
  
  console.log("All uploads completed.");
}

main().catch(console.error);
