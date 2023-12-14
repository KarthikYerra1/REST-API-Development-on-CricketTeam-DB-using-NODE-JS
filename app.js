const express = require("express");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
app.use(express.json());

let db;
const dbPath = path.join(__dirname, "cricketMatchDetails.db");

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server has been started");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const convertMatchesDbObjectToResponseObject = (match) => {
  return {
    matchId: match.match_id,
    match: match.match,
    year: match.year,
  };
};

//Get all players API
app.get("/players/", async (req, res) => {
  const getAllPlayersQuery = `
        SELECT * FROM player_details
    `;
  const players = await db.all(getAllPlayersQuery);
  res.send(
    players.map((each) => {
      return {
        playerId: each.player_id,
        playerName: each.player_name,
      };
    })
  );
});

//Get SinglePlayer using ID API
app.get("/players/:playerId/", async (req, res) => {
  const { playerId } = req.params;
  const getPlayerQuery = `
        SELECT * FROM player_details WHERE player_id = ${playerId}
    `;
  const player = await db.get(getPlayerQuery);
  res.send({
    playerId: player.player_id,
    playerName: player.player_name,
  });
});

//Update player using playerId API
app.put("/players/:playerId/", async (req, res) => {
  const { playerId } = req.params;
  const playerDetails = req.body;
  const { playerName } = playerDetails;
  const updatePlayerQuery = `
        UPDATE player_details SET player_name='${playerName}' WHERE player_id = ${playerId}
    `;
  const dbResponse = await db.run(updatePlayerQuery);
  res.send("Player Details Updated");
});

//Get Match Details of a Specific Match API
app.get("/matches/:matchId/", async (req, res) => {
  const { matchId } = req.params;
  const getMatchDetailsQuery = `
        SELECT * FROM match_details WHERE match_id = ${matchId}
    `;
  const match = await db.get(getMatchDetailsQuery);
  res.send(convertMatchesDbObjectToResponseObject(match));
});

//Get list of matches of a specific player API
app.get("/players/:playerId/matches", async (req, res) => {
  const { playerId } = req.params;
  const getMatchDetailsOfPlayerQuery = `
        SELECT * FROM match_details JOIN player_match_score
        ON match_details.match_id = player_match_score.match_id
        WHERE player_match_score.player_id = ${playerId}
    `;
  const matches = await db.all(getMatchDetailsOfPlayerQuery);
  res.send(matches.map((each) => convertMatchesDbObjectToResponseObject(each)));
});

//Get List of Players of a specific match API
app.get("/matches/:matchId/players", async (req, res) => {
  const { matchId } = req.params;
  const getPlayersOfMatchQuery = `
        SELECT * FROM player_details JOIN player_match_score 
        ON player_details.player_id = player_match_score.player_id
        WHERE player_match_score.match_id = ${matchId}
    `;
  const players = await db.all(getPlayersOfMatchQuery);
  res.send(
    players.map((each) => {
      return {
        playerId: each.player_id,
        playerName: each.player_name,
      };
    })
  );
});

//Get total Statistics of a player API
app.get("/players/:playerId/playerScores", async (req, res) => {
  const { playerId } = req.params;
  const getStatsOfAPlayerQuery = `
        SELECT player_details.player_id as playerId,
        player_details.player_name as playerName,
        SUM(player_match_score.score) as totalScore,
        SUM(player_match_score.fours) as totalFours,
        SUM(player_match_score.sixes) as totalSixes
        FROM player_match_score INNER JOIN player_details ON 
        player_match_score.player_id = player_details.player_id
        WHERE player_details.player_id = ${playerId}
    `;
  const playerStats = await db.get(getStatsOfAPlayerQuery);
  res.send(playerStats);
});

module.exports = app;
