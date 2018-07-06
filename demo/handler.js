const processItem = (event) => {
  console.log('[new dynamodb event received] :=> ', JSON.stringify(event));
};

export default { processItem };
