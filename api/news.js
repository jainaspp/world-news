import { createClient } from '@supabase/supabase-js';

const SB_URL = 'https://qpckwhnbawprbkkizcmn.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2t3aG5iYXdwcmJra2l6Y21uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0OTAyMzMsImV4cCI6MjA5MTA2NjIzM30.7vMNxsKczXGxzzGmimlN338BsK7tSHzejaw4bC2kOs4';

const supabase = createClient(SB_URL, SB_KEY);
const HKG_RE = /香港|rthk|hkfp|852|明報|港聞|港股/i;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const group = (req.query.group || 'ALL').toUpperCase();
  
  try {
    const { data, error } = await supabase
      .from('news')
      .select('id, title, summary, link, source, pub_date, image_url, region')
      .order('pub_date', { ascending: false })
      .limit(group === 'HKG' ? 200 : 80);
    
    if (error) throw error;
    
    const news = (data || []).slice(0, 80);
    const filtered = group === 'HKG'
      ? news.filter(r => HKG_RE.test(r.title || '')).slice(0, 50)
      : news.slice(0, 50);
    
    return res.status(200).json(filtered);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
