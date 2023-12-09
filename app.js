const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const awsServerlessExpress = require("aws-serverless-express");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@job-board-platform.xrps9xx.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let cachedDb = null;

const connectToDatabase = async () => {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    await client.connect();
    const db = client.db("JobBoard");
    cachedDb = db;
    return db;
  } catch (error) {
    console.error("Error connecting to the database", error);
    throw error;
  }
};

const run = async () => {
  const db = await connectToDatabase();

  const jobsCollections = db.collection("demoJobs");

  app.post("/post-job", async (req, res) => {
    const body = req.body;
    body.createAt = new Date();

    try {
      const result = await jobsCollections.insertOne(body);
      if (result.insertedId) {
        return res.status(200).send(result);
      } else {
        return res.status(404).send({
          message: "Can not insert! Try again later",
          status: false,
        });
      }
    } catch (error) {
      console.error("Error posting job", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.get("/all-jobs", async (req, res) => {
    try {
      const jobs = await jobsCollections.find().toArray();
      res.send(jobs);
    } catch (error) {
      console.error("Error getting all jobs", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  });

  app.get("/", (req, res) => {
    res.send("Hello Developer!");
  });

  return app;
};

// The handler function for AWS Lambda
module.exports.handler = async (event, context) => {
  try {
    const handler = await run();
    const server = awsServerlessExpress.createServer(handler);
    return awsServerlessExpress.proxy(server, event, context, "PROMISE")
      .promise;
  } catch (error) {
    console.error("Lambda handler error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};
