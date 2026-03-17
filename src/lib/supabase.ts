import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://zcxcpcicyegponagearx.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjVmOWExNzk5LTI0N2EtNDczYS04N2NlLWViMGQyOWE5YWZmOCJ9.eyJwcm9qZWN0SWQiOiJ6Y3hjcGNpY3llZ3BvbmFnZWFyeCIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzczNzI4MzAyLCJleHAiOjIwODkwODgzMDIsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.oIn2XZzaFtYpY97HnBhiVVtScnJ4R9pOoLlinExYQ5M';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };