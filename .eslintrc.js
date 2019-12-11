module.exports = {
  "extends": "airbnb-base",
  "rules": {
  },
  "env": {
    "node": true,
    "mocha": true
  },
  "overrides": [
    {
      "files": [
        "*.test.js",
        "*.spec*"
      ],
      "rules": {
        "no-unused-expressions": "off"
      }
    },
    {
      "files": [
        "*"
      ],
      "rules": {
        "class-methods-use-this": "off",
        "import/no-extraneous-dependencies" : "off",
        "no-plusplus": "off",
        "no-await-in-loop": "off",
        "max-len": ["error", { "code": 180 }]

      }
    }
  ]
};
