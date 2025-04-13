// netlify/functions/submit-score.js
const { createClient } = require('@supabase/supabase-js');

// Basic sanitation helper
function sanitize(str) {
    const sanitized = str ? str.replace(/<script.*?>.*?<\/script>/gi, '').trim() : '';
    return sanitized.replace(/[<>$`]/g, '');
}

const SUPABASE_DATABASE_URL = process.env.SUPABASE_DATABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const MIN_NICKNAME_LENGTH = 3;
const MAX_NICKNAME_LENGTH = 12;

if (!SUPABASE_DATABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Supabase Database URL or Service Key environment variable not set.');
}

// Create a single supabase client for interacting with your database
const supabase = createClient(SUPABASE_DATABASE_URL, SUPABASE_SERVICE_KEY);

exports.handler = async (event, context) => {
    console.log("Function 'submit-score' (Supabase) invoked.");

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!supabase) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Database client configuration missing.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        let { score, nickname, deviceId } = body;

        // --- Input Validation ---
        if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid score.' }) };
        }
        if (typeof nickname !== 'string' || !nickname.trim()) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Nickname cannot be empty.' }) };
        }
        const sanitizedNickname = sanitize(nickname).substring(0, MAX_NICKNAME_LENGTH);
        if (sanitizedNickname.length < MIN_NICKNAME_LENGTH) {
            return { statusCode: 400, body: JSON.stringify({ error: `Nickname must be ${MIN_NICKNAME_LENGTH}-${MAX_NICKNAME_LENGTH} chars.` }) };
        }
        if (typeof deviceId !== 'string' || !deviceId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing device identifier.' }) };
        }
        // Ensure deviceId is lowercase if your RLS policy expects it
        deviceId = deviceId.toLowerCase();
        // --- End Validation ---

        console.log(`Processing score: ${score}, nickname: ${sanitizedNickname}, deviceId: ${deviceId}`);

        // Prepare data for upsert
        const scoreData = {
            device_id: deviceId, // Ensure column names match your table schema
            nickname: sanitizedNickname,
            score: score,
            // Supabase automatically handles created_at/updated_at if columns are set up
            // updated_at: new Date().toISOString(),
        };

        // Use upsert to either insert a new score or update an existing one
        // if the new score is higher. This requires a unique constraint on device_id
        // and potentially a database trigger or RLS policy to enforce the high score logic.

        // Simpler approach: Fetch existing score first, then update or insert.
        // 1. Check if a score for this device exists
        const { data: existingData, error: fetchError } = await supabase
            .from('scores')
            .select('score')
            .eq('device_id', deviceId)
            .maybeSingle(); // Returns one row or null, not an error if not found

        if (fetchError) {
            console.error('Error fetching existing score:', fetchError);
            throw new Error('Could not verify existing score.');
        }

        let action = 'ignored_no_change';
        let finalScore = existingData ? existingData.score : -1;

        if (!existingData) {
            // 2a. Insert new score if none exists
            console.log(`No existing score found for ${deviceId}. Inserting new score.`);
            const { error: insertError } = await supabase
                .from('scores')
                .insert(scoreData);

            if (insertError) {
                console.error('Error inserting new score:', insertError);
                throw new Error('Failed to insert new score.');
            }
            action = 'created';
            finalScore = score;
            console.log(`New score created for ${deviceId}.`);

        } else if (score > existingData.score) {
            // 2b. Update existing score if new score is higher
            console.log(`New score ${score} is higher than existing ${existingData.score} for ${deviceId}. Updating.`);
            const { error: updateError } = await supabase
                .from('scores')
                .update({ score: score, nickname: sanitizedNickname /*, updated_at: new Date().toISOString() */ })
                .eq('device_id', deviceId);

            if (updateError) {
                console.error('Error updating score:', updateError);
                throw new Error('Failed to update score.');
            }
            action = 'updated';
            finalScore = score;
            console.log(`Score updated for ${deviceId}.`);
        } else {
            // 2c. New score is not higher, do nothing
            action = 'ignored_lower_score';
            console.log(`New score ${score} is not higher than existing ${existingData.score} for ${deviceId}. Ignoring.`);
        }

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'success',
                action: action,
                submittedScore: score,
                nickname: sanitizedNickname,
                deviceHighScore: finalScore,
            }),
        };

    } catch (error) {
        console.error('Error submitting score:', error.message || error);
        // Consider specific error codes if needed (e.g., 409 for conflict if using upsert without checks)
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to submit score.', details: error.message }),
        };
    }
}; 