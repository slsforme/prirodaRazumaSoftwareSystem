from faker import Faker

fake: Faker = Faker()

def generate_valid_login():
    login = fake.user_name()
    while len(login) < 5:
        login = fake.user_name() + str(fake.random_int(min=100, max=999))
    return login
