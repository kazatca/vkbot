start:
	node -r dotenv/config index.js

test:
	mocha --require dotenv/config --timeout 120000 -g "$(g)"

.PHONY: test