start:
	node -r dotenv/config bot.js

test:
	mocha --require dotenv/config --timeout 120000 -g "$(g)"

.PHONY: test