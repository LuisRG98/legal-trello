
def test_admin_can_list_sales_users(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        full_name="Administrator",
        email="admin@example.com",
        nickname="admin",
        role="ADMIN",
    )

    make_user(
        full_name="John Smith",
        email="john@example.com",
        nickname="jsmith",
        role="SALES",
    )

    authenticate(admin)

    response = client.get("/api/v1/users/sales")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["full_name"] == "John Smith"
    assert data[0]["nickname"] == "jsmith"


def test_manager_can_list_sales_users(
    client,
    make_user,
    authenticate,
):
    manager = make_user(
        full_name="Manager User",
        email="manager@example.com",
        nickname="manager",
        role="MANAGER",
    )

    make_user(
        full_name="Sales User",
        email="sales@example.com",
        nickname="salesuser",
        role="SALES",
    )

    authenticate(manager)

    response = client.get("/api/v1/users/sales")

    assert response.status_code == 200
    assert len(response.json()) == 1


def test_sales_user_cannot_list_sales_users(
    client,
    make_user,
    authenticate,
):
    sales_user = make_user(
        role="SALES",
        email="sales@example.com",
        nickname="salesuser",
    )

    authenticate(sales_user)

    response = client.get("/api/v1/users/sales")

    assert response.status_code == 403


def test_request_without_token_returns_401(
    client,
    make_user,
):
    make_user(
        role="SALES",
        email="sales@example.com",
        nickname="salesuser",
    )

    response = client.get("/api/v1/users/sales")

    assert response.status_code == 401


def test_inactive_sales_users_are_not_returned(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    make_user(
        full_name="Active Sales",
        email="active@example.com",
        nickname="active",
        role="SALES",
        is_active=True,
    )

    make_user(
        full_name="Inactive Sales",
        email="inactive@example.com",
        nickname="inactive",
        role="SALES",
        is_active=False,
    )

    authenticate(admin)

    response = client.get("/api/v1/users/sales")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["full_name"] == "Active Sales"


def test_other_roles_are_not_returned(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    make_user(
        role="MANAGER",
        email="manager@example.com",
        nickname="manager",
    )

    make_user(
        role="SALES",
        email="sales@example.com",
        nickname="sales",
    )

    authenticate(admin)

    response = client.get("/api/v1/users/sales")

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["nickname"] == "sales"


def test_sales_response_does_not_expose_password_hash(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    make_user(
        role="SALES",
        email="sales@example.com",
        nickname="sales",
    )

    authenticate(admin)

    response = client.get("/api/v1/users/sales")

    assert response.status_code == 200

    user_data = response.json()[0]

    assert "password_hash" not in user_data
    assert "password" not in user_data



def test_admin_can_create_user(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    authenticate(admin)

    payload = {
        "full_name": "New Sales User",
        "email": "new.sales@example.com",
        "nickname": "newsales",
        "password": "StrongPassword123!",
        "role": "SALES",
    }

    response = client.post(
        "/api/v1/users",
        json=payload,
    )

    assert response.status_code == 201

    data = response.json()

    assert data["full_name"] == "New Sales User"
    assert data["email"] == "new.sales@example.com"
    assert data["nickname"] == "newsales"
    assert data["role"] == "SALES"
    assert data["is_active"] is True

    # Never expose the password hash in the API response.
    assert "password_hash" not in data
    assert "password" not in data


def test_create_user_rejects_duplicate_email(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    make_user(
        email="existing@example.com",
        nickname="existing",
        role="SALES",
    )

    authenticate(admin)

    payload = {
        "full_name": "Another Sales User",
        "email": "existing@example.com",
        "nickname": "another",
        "password": "StrongPassword123!",
        "role": "SALES",
    }

    response = client.post(
        "/api/v1/users",
        json=payload,
    )

    assert response.status_code == 409


def test_create_user_rejects_duplicate_nickname(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    make_user(
        email="existing@example.com",
        nickname="existing",
        role="SALES",
    )

    authenticate(admin)

    payload = {
        "full_name": "Another Sales User",
        "email": "another@example.com",
        "nickname": "existing",
        "password": "StrongPassword123!",
        "role": "SALES",
    }

    response = client.post(
        "/api/v1/users",
        json=payload,
    )

    assert response.status_code == 409


def test_manager_cannot_create_users(
    client,
    make_user,
    authenticate,
):
    manager = make_user(
        role="MANAGER",
        email="manager@example.com",
        nickname="manager",
    )

    authenticate(manager)

    payload = {
        "full_name": "New Sales User",
        "email": "new.sales@example.com",
        "nickname": "newsales",
        "password": "StrongPassword123!",
        "role": "SALES",
    }

    response = client.post(
        "/api/v1/users",
        json=payload,
    )

    assert response.status_code == 403


def test_admin_can_update_user_role(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    sales_user = make_user(
        role="SALES",
        email="sales@example.com",
        nickname="sales",
    )

    authenticate(admin)

    response = client.patch(
        f"/api/v1/users/{sales_user.id}/role",
        json={"role": "MANAGER"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "MANAGER"


def test_admin_can_deactivate_user(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    sales_user = make_user(
        role="SALES",
        email="sales@example.com",
        nickname="sales",
    )

    authenticate(admin)

    response = client.patch(
        f"/api/v1/users/{sales_user.id}/status",
        json={"is_active": False},
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False


def test_manager_cannot_update_user_role(
    client,
    make_user,
    authenticate,
):
    manager = make_user(
        role="MANAGER",
        email="manager@example.com",
        nickname="manager",
    )

    sales_user = make_user(
        role="SALES",
        email="sales@example.com",
        nickname="sales",
    )

    authenticate(manager)

    response = client.patch(
        f"/api/v1/users/{sales_user.id}/role",
        json={"role": "ADMIN"},
    )

    assert response.status_code == 403


def test_admin_cannot_deactivate_own_account(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    authenticate(admin)

    response = client.patch(
        f"/api/v1/users/{admin.id}/status",
        json={"is_active": False},
    )

    assert response.status_code == 400


def test_admin_cannot_change_own_role(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    authenticate(admin)

    response = client.patch(
        f"/api/v1/users/{admin.id}/role",
        json={"role": "SALES"},
    )

    assert response.status_code == 400



def test_admin_can_deactivate_another_admin_if_one_remains(
    client,
    make_user,
    authenticate,
):
    admin = make_user(
        role="ADMIN",
        email="admin@example.com",
        nickname="admin",
    )

    another_admin = make_user(
        role="ADMIN",
        email="another@example.com",
        nickname="another",
    )

    authenticate(another_admin)

    response = client.patch(
        f"/api/v1/users/{admin.id}/status",
        json={"is_active": False},
    )

    assert response.status_code == 200
    assert response.json()["is_active"] is False

    # The administrator performing the operation remains active.
    assert another_admin.is_active is True
