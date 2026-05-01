// Used only by Jest (NODE_ENV === "test"). Production runtime stays pure ESM.
module.exports = (api) => {
  const isTest = api.env("test");
  if (!isTest) return {};
  return {
    presets: [["@babel/preset-env", { targets: { node: "current" } }]],
  };
};
