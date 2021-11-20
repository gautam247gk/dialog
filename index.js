const express = require("express");
//reqs for fs
const fs = require("fs");
const util = require("util");
//req for wav
const wavefile = require("wavefile");
let wav = new wavefile.WaveFile();
//normals reqs
const dialogflow = require("@google-cloud/dialogflow");
const CREDENTIALS = require("./credentials.json");
// google dialogflow project-id
const PROJECID = CREDENTIALS.project_id;
// Configuration for the client
const CONFIGURATION = {
  credentials: {
    private_key: CREDENTIALS["private_key"],
    client_email: CREDENTIALS["client_email"],
  },
};

// new session
const sessionClient = new dialogflow.SessionsClient(CONFIGURATION);

// Detect Audio intent method
const detectAudioIntent = async (languageCode, inputAudio, sessionId) => {
  let sessionPath = sessionClient.projectAgentSessionPath(PROJECID, sessionId);

  // The audio query request.
  let request = {
    session: sessionPath,
    queryInput: {
      audioConfig: {
        audioEncoding: "PCM",
        languageCode: languageCode,
      },
    },
    inputAudio: inputAudio,
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  //console.log(responses);
  const result = responses[0].queryResult;
  console.log(result);

  return {
    response: result.fulfillmentText,
  };
};

const detectTextIntent = async (languageCode, inputText, sessionId) => {
  let sessionPath = sessionClient.projectAgentSessionPath(PROJECID, sessionId);

  // The audio query request.
  let request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: inputText,
        languageCode: languageCode,
      },
    },
  };

  // Send request and log result
  const responses = await sessionClient.detectIntent(request);
  //console.log(responses);
  const result = responses[0].queryResult;
  console.log(result);

  return {
    response: result.fulfillmentText,
  };
};

// Start the webapp
const webApp = express();

// Webapp settings
webApp.use(
  express.urlencoded({
    limit: "50mb",
    extended: false,
  })
);
webApp.use(express.json({ limit: "50mb" }));
webApp.use(express.json());
const PORT = process.env.PORT || 3000;

// Dialogflow route
webApp.post("/diagreq", async (req, res) => {
  let languageCode = req.body.languageCode || "en";
  let sessionId = req.body.sessionID || "123";
  let inputAudio = req.body.inputAudio;
  let finalInputAudio;
  let responseData;
  if (Array.isArray(inputAudio)) {
    //encoding wav and saving to tempfile
    wav.fromScratch(1, 8000, "8", inputAudio);
    // Change the bit depth to 16-bit
    wav.toBitDepth("16");
    fs.writeFileSync("temp.wav", wav.toBuffer());
    //taking audio input from file
    const readFile = util.promisify(fs.readFile);
    finalInputAudio = await readFile("temp.wav");
    responseData = await detectAudioIntent(
      languageCode,
      finalInputAudio,
      sessionId
    );
  } else {
    finalInputAudio = inputAudio;
    responseData = await detectTextIntent(
      languageCode,
      finalInputAudio,
      sessionId
    );
  }

  console.log(responseData.response);
  res.send(responseData.response);
});
//default page
webApp.get("/", (req, res) => {
  res.send(
    "Please make a post request from the example json to dev.bibox.in/diagreq"
  );
});
// Start the server
webApp.listen(PORT, () => {
  console.log(`Server is up and running at ${PORT}`);
});
