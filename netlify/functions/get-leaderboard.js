// netlify/functions/get-leaderboard.js
const faunadb = require('faunadb');
const q = faunadb.query;

// Read the FaunaDB server secret from environment variables
const FAUNA_SECRET = process.env.FAUNA_SERVER_SECRET;
const LEADERBOARD_SIZE = 10; // How many scores to fetch

if (!FAUNA_SECRET) {
    console.error('FAUNA_SERVER_SECRET environment variable not set.');
    // Don't return detailed errors to the client in production
    // return { statusCode: 500, body: 'Internal Server Error: Missing DB Configuration' };
}

// Configure the FaunaDB client
const client = new faunadb.Client({
    secret: FAUNA_SECRET,
    // Adjust the endpoint if you are using a specific Fauna region
    // domain: 'db.us.fauna.com', // Example for US region
});

exports.handler = async (event, context) => {
    console.log("Function 'get-leaderboard' invoked.");

    if (!FAUNA_SECRET) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Database configuration missing.' })
        };
    }

    try {
        const result = await client.query(
            q.Map(
                q.Paginate(
                    q.Match(q.Index('scores_sort_by_score_desc')), // Use the index we created
                    { size: LEADERBOARD_SIZE } // Limit the number of results
                ),
                q.Lambda(
                    ['score', 'ref'], // The index returns [score, ref]
                    q.Let(
                        { doc: q.Get(q.Var('ref')) },
                        {
                            // Only return necessary fields to the client
                            nickname: q.Select(['data', 'nickname'], q.Var('doc')),
                            score: q.Select(['data', 'score'], q.Var('doc')),
                            // Optional: Add timestamp if stored
                            // timestamp: q.Select(['data', 'timestamp'], q.Var('doc'), null)
                        }
                    )
                )
            )
        );

        console.log(`Successfully fetched ${result.data.length} scores.`);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                // Add CORS headers if your function URL is different from your site URL
                // 'Access-Control-Allow-Origin': '*', // Be more specific in production
            },
            body: JSON.stringify(result.data),
        };
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        // Avoid exposing detailed internal errors to the client
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch leaderboard data.' }),
        };
    }
}; 