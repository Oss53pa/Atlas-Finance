#!/usr/bin/env python
import os
import sys
import subprocess
import io
from contextlib import redirect_stdout

def run_makemigrations():
    """Run makemigrations with automated input"""

    # Mock input for Django's questioner
    class MockInput:
        def __init__(self, responses):
            self.responses = responses
            self.index = 0

        def __call__(self, prompt=""):
            if self.index < len(self.responses):
                response = self.responses[self.index]
                self.index += 1
                print(f"{prompt}{response}")  # Show what we're answering
                return response
            return ""

    # Prepare automated responses
    # 1. For account_class field: provide default "1"
    # 2. For any other non-nullable fields: provide default values
    responses = ["1", "1"]  # First "1" for choice, second "1" for default value

    # Temporarily replace input function
    original_input = __builtins__.get('input', input)
    __builtins__['input'] = MockInput(responses)

    try:
        # Run the makemigrations command
        result = subprocess.run([
            sys.executable, 'manage.py', 'makemigrations', 'accounting',
            '--settings=wisebook.simple_settings'
        ], capture_output=True, text=True, cwd=os.getcwd())

        print("STDOUT:")
        print(result.stdout)

        if result.stderr:
            print("STDERR:")
            print(result.stderr)

        return result.returncode == 0

    finally:
        # Restore original input
        __builtins__['input'] = original_input

if __name__ == "__main__":
    print("Creating migrations automatically...")
    success = run_makemigrations()

    if success:
        print("✅ Migrations created successfully!")

        # Apply migrations
        print("Applying migrations...")
        migrate_result = subprocess.run([
            sys.executable, 'manage.py', 'migrate',
            '--settings=wisebook.simple_settings'
        ], capture_output=True, text=True, cwd=os.getcwd())

        print(migrate_result.stdout)
        if migrate_result.stderr:
            print("MIGRATE STDERR:")
            print(migrate_result.stderr)

        if migrate_result.returncode == 0:
            print("✅ Migrations applied successfully!")
        else:
            print("❌ Error applying migrations")

    else:
        print("❌ Error creating migrations")