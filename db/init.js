const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data.sqlite');

function createDatabase() {
  const db = new Database(DB_PATH);

  db.exec(`
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS robots;

    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      is_admin INTEGER NOT NULL DEFAULT 0,
      secret_note TEXT NOT NULL
    );

    CREATE TABLE robots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      status TEXT NOT NULL
    );
  `);

  const insertUser = db.prepare(
    'INSERT INTO users (username, password, is_admin, secret_note) VALUES (?, ?, ?, ?)'
  );
  const users = [
    ['admin', 'admin', 1, 'Root API key: sk-live-7f3a9c2e-prod'],
    ['alice', 'alice2024', 0, 'Favorite lab: Boston Dynamics intern program'],
    ['bob', 'bobpass', 0, 'Payroll grade: L4'],
    ['carol', 'carolpw', 0, 'Pending patent: soft-gripper actuator'],
    ['dave', 'davepw', 0, 'Access badge code: 48213'],
  ];
  for (const u of users) insertUser.run(...u);

  const insertRobot = db.prepare(
    'INSERT INTO robots (name, category, description, status) VALUES (?, ?, ?, ?)'
  );
  const robots = [
    ['Atlas-9', 'Humanoid', 'Bipedal humanoid for warehouse logistics.', 'Active'],
    ['HexCrawler', 'Hexapod', 'Six-legged terrain inspection robot.', 'Active'],
    ['SwarmBee v2', 'Swarm', 'Micro-drone swarm for crop monitoring.', 'Prototype'],
    ['DeepDiver', 'Underwater', 'Autonomous underwater survey unit.', 'Active'],
    ['GripMaster', 'Manipulator', 'Soft-robotic gripping arm for assembly lines.', 'Active'],
    ['PathFinder RL', 'Research', 'Reinforcement-learning navigation testbed.', 'Research'],
    ['VisionScout', 'Computer Vision', 'Edge-deployed object detection rover.', 'Active'],
    ['SimTwin', 'Sim-to-Real', 'Digital-twin platform for policy transfer.', 'Research'],
  ];
  for (const r of robots) insertRobot.run(...r);

  return db;
}

module.exports = { createDatabase, DB_PATH };
