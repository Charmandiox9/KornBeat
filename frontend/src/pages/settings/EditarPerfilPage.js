import React, { useContext, useState } from "react";
import axios from "axios";
import { AuthContext } from "../../context/authContext";
import TopBar from "../../components/TopBar";
import BottomBar from "../../components/BottomBar";
import "../../styles/settingscss/EditarPerfil.css";

const EditarPerfilPage = () => {
  const { user, checkAuth } = useContext(AuthContext);
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    newPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem("accessToken");

      await axios.put(
        `${API_URL}/users/update-profile`,
        {
          name: form.name,
          email: form.email,
          password: form.password,
          newPassword: form.newPassword,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Perfil actualizado correctamente");
      await checkAuth();
    } catch (error) {
      alert(error.response?.data?.message || "Error al actualizar perfil");
    }
  };

  return (
    <div className="principal-containe2">
      <TopBar />
      <main className="principal-content">
        <div className="edit-profile-wrapper">
          <div className="edit-profile-card">

            <h1 className="edit-profile-title">Editar Perfil</h1>

            <form className="edit-form" onSubmit={handleSubmit}>

              <div className="edit-form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                />
              </div>

              <div className="edit-form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Tu correo"
                />
              </div>

              <div className="edit-form-group">
                <label>Contraseña actual</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>

              <div className="edit-form-group">
                <label>Nueva contraseña</label>
                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="Tu nueva contraseña"
                />
              </div>

              <button type="submit" className="edit-profile-btn">
                Guardar Cambios
              </button>
            </form>

            <button className="back-btn" onClick={() => window.history.back()}>
              Volver
            </button>

          </div>
        </div>
      </main>

      <BottomBar />
    </div>
  );
};

export default EditarPerfilPage;

