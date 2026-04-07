const logDebug = (requestId, stage, payload) => {
  const timestamp = new Date().toISOString();
  const safePayload = payload === undefined ? {} : payload;

  try {
    console.log(
      JSON.stringify({
        level: "debug",
        timestamp,
        requestId,
        stage,
        payload: safePayload,
      })
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        level: "debug",
        timestamp,
        requestId,
        stage,
        payload: { message: "Unable to serialize payload." },
      })
    );
  }
};

module.exports = {
  logDebug,
};
