// netlify/functions/get-leaderboard.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const LEADERBOARD_SIZE = 10; // How many scores to fetch

if (!SUPABASE_DATABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase Database URL or Service Key environment variable not set.');
}

// Create a single supabase client for interacting with your database
const supabase = createClient(SUPABASE_DATABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("Function 'get-leaderboard' (Supabase) invoked.");

    if (!supabase) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database client configuration missing.' })
        };
    }

    try {
        // Fetch scores from the 'scores' table, ordered by score descending, limit to LEADERBOARD_SIZE
        const { data, error } = await supabase
            .from('scores') // Your table name
            .select('nickname, score') // Select only the needed columns
            .order('score', { ascending: false }) // Order by score, highest first
            .limit(LEADERBOARD_SIZE); // Limit the results

        if (error) {
            throw error; // Throw the error to be caught by the catch block
        }

        console.log(`Successfully fetched ${data.length} scores.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                // Optional CORS header if needed:
                // 'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(data || []), // Return fetched data or empty array
        };
    } catch (error) {
        console.error('Error fetching leaderboard:', error.message || error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch leaderboard data.', details: error.message }),
        };
    }
}; 