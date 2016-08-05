start:
	node -r dotenv/config index.js

test:
	mocha --require dotenv/config --timeout 10000

.PHONY: test