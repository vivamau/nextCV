#!/bin/bash
cd "$(dirname "$0")/.."
npx jest --forceExit --coverage 2>&1
