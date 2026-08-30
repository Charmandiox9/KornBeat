'use client';
import React, { useContext, useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { AuthContext } from "@/context/authContext";
import { useI18n } from "@/context/I18nContext";
import { scaleIn, shake } from "@/lib/animations";
import TopBar from "@/components/common/TopBar";
import BottomBar from "@/components/common/BottomBar";
import "./EditarPerfil.css";

const EditarPerfilPage = () => {
  const { user, checkAuth } = useContext(AuthContext);
  const { t } = useI18n();
  const API_URL = '';
  const cardRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (cardRef.current) scaleIn(cardRef.current);
  }, []);

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

      toast.success(t('edit.saved'));
      await checkAuth();
    } catch (error) {
      if (formRef.current) shake(formRef.current);
      toast.error(error.response?.data?.message || t('edit.error'));
    }
  };

  return (
    <div className="principal-containe2">
      <TopBar />
      <main className="principal-content">
        <div className="edit-profile-wrapper">
          <div className="edit-profile-card" ref={cardRef}>

            <h1 className="edit-profile-title">{t('edit.title')}</h1>

            <form className="edit-form" ref={formRef} onSubmit={handleSubmit}>

              <div className="edit-form-group">
                <label>{t('auth.name')}</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t('edit.namePh')}
                />
              </div>

              <div className="edit-form-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={t('edit.emailPh')}
                />
              </div>

              <div className="edit-form-group">
                <label>{t('edit.currentPassword')}</label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t('edit.currentPasswordPh')}
                />
              </div>

              <div className="edit-form-group">
                <label>{t('edit.newPassword')}</label>
                <input
                  type="password"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder={t('edit.newPasswordPh')}
                />
              </div>

              <button type="submit" className="edit-profile-btn">
                {t('edit.save')}
              </button>
            </form>

            <button className="back-btn" onClick={() => window.history.back()}>
              {t('edit.back')}
            </button>

          </div>
        </div>
      </main>

      <BottomBar />
    </div>
  );
};

export default EditarPerfilPage;
