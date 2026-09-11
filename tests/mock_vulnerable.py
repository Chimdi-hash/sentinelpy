class VulnerableVault:
    def __init__(self):
        self.balances = {}

    def deposit(self, user, amount):
        self.balances[user] = self.balances.get(user, 0) + amount

    def withdraw(self, user, amount):
        if self.balances.get(user, 0) >= amount:
            # VULNERABILITY: State updated AFTER external transfer
            send_funds(user, amount)
            self.balances[user] -= amount

