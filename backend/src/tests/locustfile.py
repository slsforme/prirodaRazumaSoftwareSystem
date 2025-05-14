from locust import HttpUser, task, between
from faker import Faker

import random
import io


fake: Faker = Faker()
ru_fake: Faker = Faker("ru_RU")
BASE_URL = "/api/v1"
ROLE_ID = 10  # Администратор


def generate_valid_login():
    login = fake.user_name()
    while len(login) < 5:
        login = fake.user_name() + str(fake.random_int(min=100, max=999))
    return login


class TestUser(HttpUser):
    wait_time = between(1, 2)

    def on_start(self):
        username: str = fake.user_name()
        password: str = fake.password(length=12)

        self.test_registration_user = {
            "login": username,
            "password": password,
            "fio": ru_fake.name()
            + " "
            + ru_fake.last_name()
            + " "
            + ru_fake.last_name(),
            "role_id": ROLE_ID,
        }

        with self.client.post(
            f"{BASE_URL}/auth/register",
            json=self.test_registration_user,
            catch_response=True,
            name="[Аутентификация] Регистрация",
        ) as response:
            if response.status_code not in [201, 409]:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

        with self.client.post(
            f"{BASE_URL}/auth/login",
            data={
                "grant_type": "password",
                "username": username,
                "password": password,
                "client_id": "test_client",
                "client_secret": "test_secret",
                "scope": "openid",
            },
            catch_response=True,
            name="[Аутентификация] Авторизация",
        ) as response:
            if response.ok:
                self.auth_token = response.json().get("access_token")
                self.refresh_token = response.json().get("refresh_token")
                self.user_id = response.json().get("user_id")
            else:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

    @task(1)
    def get_docs(self):
        with self.client.get(
            BASE_URL + "/docs",
            name="[Страницы] Получение Документации",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

    @task(1)
    def get_statistics(self):
        if not self.auth_token:
            return

        with self.client.get(
            f"{BASE_URL}/statistics/documents/weekly",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Статистика] Еженедельно",
        ) as response:
            if not response.ok:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

        with self.client.get(
            f"{BASE_URL}/statistics/documents/weekly/user/{self.user_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Статистика] Пользователь Еженедельно",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

    @task(1)
    def crud_roles(self):
        if not self.auth_token:
            return

        data = {
            "name": f"{ru_fake.job().replace(' ', '_')}",
            "description": ru_fake.sentence().replace(".", " "),
        }

        role_id = None
        with self.client.post(
            f"{BASE_URL}/roles",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            json=data,
            name="[Роли] Создать Роль",
            catch_response=True,
        ) as response:
            if response.ok:
                role_id = response.json().get("id")
            else:
                response.failure(f"Создание: {response.status_code} | {response.text}")
                return

        update_data = {
            "name": f"{fake.job().replace(' ', '_')}",
            "description": fake.sentence().replace(".", " "),
        }
        with self.client.put(
            f"{BASE_URL}/roles/{role_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            json=update_data,
            name="[Роли] Обновить Роль",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(
                    f"Обновление: {response.status_code} | {response.text}"
                )

        with self.client.get(
            f"{BASE_URL}/roles",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Роли] Получить все Роли",
            catch_response=True,
        ) as response:
            if response.ok:
                roles = response.json()
                if not any(r["id"] == role_id for r in roles):
                    response.failure("Роль не найдена в списке")
            else:
                response.failure(
                    f"Получение всех: {response.status_code} | {response.text}"
                )

        with self.client.get(
            f"{BASE_URL}/roles/{role_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Роли] Получить Роль по ID",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(
                    f"Получение по ID: {response.status_code} | {response.text}"
                )

        with self.client.delete(
            f"{BASE_URL}/roles/{role_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Роли] Удалить Роль",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(f"Удаление: {response.status_code} | {response.text}")

    @task(3)
    def crud_patients(self):
        if not self.auth_token:
            return

        data = {"fio": fake.name(), "age": fake.random_int(min=1, max=18)}

        patient_id = None
        with self.client.post(
            f"{BASE_URL}/patients",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            json=data,
            name="[Пациенты] Создать Пациента",
            catch_response=True,
        ) as response:
            if response.ok:
                patient_id = response.json().get("id")
            else:
                response.failure(f"Создание: {response.status_code} | {response.text}")
                return

        update_data = {"fio": ru_fake.name(), "age": ru_fake.random_int(min=1, max=18)}
        with self.client.put(
            f"{BASE_URL}/patients/{patient_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            json=update_data,
            name="[Пациенты] Обновить Пациента",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(
                    f"Обновление: {response.status_code} | {response.text}"
                )

        with self.client.get(
            f"{BASE_URL}/patients",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Пациенты] Получить всех Пациентов",
            catch_response=True,
        ) as response:
            if response.ok:
                patients = response.json()
                if not any(p["id"] == patient_id for p in patients):
                    response.failure("Пациент не найден в списке")
            else:
                response.failure(
                    f"Получение всех: {response.status_code} | {response.text}"
                )

        with self.client.get(
            f"{BASE_URL}/patients/{patient_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Пациенты] Получить Пациента по ID",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(
                    f"Получение по ID: {response.status_code} | {response.text}"
                )

        with self.client.delete(
            f"{BASE_URL}/patients/{patient_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            name="[Пациенты] Удалить Пациента",
            catch_response=True,
        ) as response:
            if not response.ok:
                response.failure(
                    f"Получение по ID: {response.status_code} | {response.text}"
                )

    @task(4)
    def crud_documents(self):
        if not self.auth_token:
            return

        pass

    @task(5)
    def crud_users(self):
        if not self.auth_token:
            return

        new_user_data = {
            "login": generate_valid_login(),
            "role_id": ROLE_ID,
            "password": fake.password(length=12),
            "fio": ru_fake.name()
            + " "
            + ru_fake.last_name()
            + " "
            + ru_fake.last_name(),
        }

        new_login = None
        user_id = None

        with self.client.post(
            f"{BASE_URL}/users",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            json=new_user_data,
            catch_response=True,
            name="[Пользователи] Создание Пользователя",
        ) as response:
            if response.ok:
                user_id = response.json().get("id")

                new_login = generate_valid_login()
                update_data = {
                    "id": user_id,
                    "login": new_login,
                    "role_id": ROLE_ID,
                    "password": fake.password(length=20),
                    "active": False,
                }

                with self.client.put(
                    f"{BASE_URL}/users/{user_id}",
                    headers={"Authorization": f"Bearer {self.auth_token}"},
                    json=update_data,
                    catch_response=True,
                    name="[Пользователи] Обновление Пользователя",
                ) as update_response:
                    if not update_response.ok:
                        response.failure(
                            f"Статус: {response.status_code} | Ответ: {response.text}"
                        )
            else:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

        with self.client.get(
            f"{BASE_URL}/users",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True,
            name="[Пользователи] Получение всех Пользователей",
        ) as response:
            if response.ok:
                users = response.json()
                if not any(u["login"] == new_login for u in users):
                    response.failure("Созданный пользователь не найден в списке")
            else:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

        with self.client.get(
            f"{BASE_URL}/users/{user_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True,
            name="[Пользователи] Получение Пользователя",
        ) as response:
            if not response.ok:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )

        with self.client.delete(
            f"{BASE_URL}/users/{user_id}",
            headers={"Authorization": f"Bearer {self.auth_token}"},
            catch_response=True,
            name="[Пользователи] Удаление Пользователя",
        ) as response:
            if not response.ok:
                response.failure(
                    f"Статус: {response.status_code} | Ответ: {response.text}"
                )
