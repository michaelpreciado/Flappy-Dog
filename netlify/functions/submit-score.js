// netlify/functions/submit-score.js
const faunadb = require('faunadb');
const q = faunadb.query;

// Basic sanitation helper
function sanitize(str) {
    // Remove potential script tags and trim whitespace
    const sanitized = str ? str.replace(/<script.*?>.*?<\/script>/gi, '').trim() : '';
    // Basic check for harmful characters - extend as needed
    return sanitized.replace(/[<>$`]/g, '');
}

const FAUNA_SECRET = process.env.FAUNA_SERVER_SECRET;
const MIN_NICKNAME_LENGTH = 3;
const MAX_NICKNAME_LENGTH = 12;

if (!FAUNA_SECRET) {
    console.error('FAUNA_SERVER_SECRET environment variable not set.');
}

const client = new faunadb.Client({
    secret: FAUNA_SECRET,
    // domain: 'db.us.fauna.com', // Adjust region if needed
});

exports.handler = async (event, context) => {
    console.log("Function 'submit-score' invoked.");

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    if (!FAUNA_SECRET) {
        return { statusCode: 500, body: JSON.stringify({ error: 'Database configuration missing.' }) };
    }

    try {
        const body = JSON.parse(event.body);
        const { score, nickname, deviceId } = body;

        // --- Input Validation ---
        if (typeof score !== 'number' || score < 0 || !Number.isInteger(score)) {
            console.warn('Invalid score received:', score);
            return { statusCode: 400, body: JSON.stringify({ error: 'Invalid score.' }) };
        }

        if (typeof nickname !== 'string' || !nickname.trim()) {
             console.warn('Invalid nickname received:', nickname);
            return { statusCode: 400, body: JSON.stringify({ error: 'Nickname cannot be empty.' }) };
        }

        const sanitizedNickname = sanitize(nickname).substring(0, MAX_NICKNAME_LENGTH);

        if (sanitizedNickname.length < MIN_NICKNAME_LENGTH) {
            console.warn('Nickname too short after sanitization:', sanitizedNickname);
            return { statusCode: 400, body: JSON.stringify({ error: `Nickname must be between ${MIN_NICKNAME_LENGTH} and ${MAX_NICKNAME_LENGTH} characters.` }) };
        }

        if (typeof deviceId !== 'string' || !deviceId) {
            console.warn('Missing deviceId.');
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing required device identifier.' }) };
        }
        // --- End Validation ---

        console.log(`Processing score: ${score}, nickname: ${sanitizedNickname}, deviceId: ${deviceId}`);

        // Use the unique index to find the existing entry for this deviceId
        const match = q.Match(q.Index('scores_by_deviceId'), deviceId);

        // Try to update or create the score document
        const result = await client.query(
            // Check if a document with this deviceId exists
            q.If(
                q.Exists(match),
                // If it exists, check if the new score is higher
                q.Let(
                    {
                        docRef: q.Select('ref', q.Get(match)),
                        currentScore: q.Select(['data', 'score'], q.Get(match))
                    },
                    q.If(
                        q.GT(score, q.Var('currentScore')),
                        // If new score is greater, update the document
                        q.Do(
                             console.log(`Updating score for deviceId ${deviceId} from ${q.Var('currentScore')} to ${score}`),
                             q.Update(q.Var('docRef'), {
                                data: {
                                    nickname: sanitizedNickname,
                                    score: score,
                                    deviceId: deviceId, // Keep deviceId
                                    updatedAt: q.Now()
                                }
                             }),
                             { action: 'updated', newScore: score } // Return status
                        ),
                        // If new score is not greater, do nothing
                        { action: 'ignored_lower_score', currentScore: q.Var('currentScore') }
                    )
                ),
                // If it doesn't exist, create a new document
                q.Do(
                    console.log(`Creating new score entry for deviceId ${deviceId}`),
                    q.Create(q.Collection('scores'), {
                        data: {
                            nickname: sanitizedNickname,
                            score: score,
                            deviceId: deviceId,
                            createdAt: q.Now()
                        }
                    }),
                    { action: 'created', newScore: score } // Return status
                )
            )
        );

        console.log('FaunaDB operation result:', result);

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                status: 'success',
                action: result.action, // 'created', 'updated', or 'ignored_lower_score'
                submittedScore: score,
                nickname: sanitizedNickname,
                // Return the actual highest score for this device
                deviceHighScore: result.action === 'ignored_lower_score' ? result.currentScore : result.newScore,
            }),
        };

    } catch (error) {
        console.error('Error submitting score:', error);
        // Check for specific Fauna errors if needed (e.g., constraint violation)
        if (error.requestResult && error.requestResult.statusCode === 400 && error.description.includes('unique constraint violation')) {
             console.error('Potential race condition or unique constraint issue.');
             return { statusCode: 409, body: JSON.stringify({ error: 'Conflict processing score. Please try again.' }) };
        }
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to submit score.' }),
        };
    }
}; 