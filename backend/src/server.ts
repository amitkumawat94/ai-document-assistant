import express from "express";

const app = express();

app.get("/", (_, res) => {
  res.json({
    success: true,
    message:"Welcome to node application."
  });
});

app.listen(5000, () => {
  console.log("Server running");
});