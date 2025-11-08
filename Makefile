# Note that for autograder reasons,
# the following variable must
# be spelled exactly PORT!
PORT1 ?= 8001
PORT2 ?= 8002
PORT3 ?= 8003
PORT ?= 8004

.PHONY: compile run_clients stop clean setup

# Setup: Install ts-node and dependencies
setup:
	@echo "Setting up dependencies..."
	@npm init -y > /dev/null 2>&1 || true
	@npm install --silent ts-node typescript @types/node > /dev/null 2>&1
	@echo "Dependencies installed."

# Empty compile target
compile:

# Run all clients and master sequentially
run_clients: setup clean
	@echo "Starting clients and master..."
	npx ts-node p1.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT) & \
	sleep 1; \
	npx ts-node p2.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT) & \
	sleep 1; \
	npx ts-node p3.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT) & \
	sleep 2; \
	npx ts-node master.ts -port1 $(PORT1) -port2 $(PORT2) -port3 $(PORT3) -port $(PORT)

# Stop all running processes
stop:
	@echo "Killing processes..."
	@pkill -f "ts-node" || true
	@echo "All processes stopped."

# Clean output files
clean:
	@echo "Cleaning up..."
	@rm -f output.txt
	@echo "Cleanup complete."