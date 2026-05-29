import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export function useAuthLogic() {
    const [searchParams] = useSearchParams();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(() => searchParams.get('mode') === 'recovery');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsLoading(true);

        try {
            if (isForgotPassword) {
                await api.post('/auth/forgot-password', { email });
                setSuccessMsg('Se este e-mail estiver cadastrado, você receberá um link de recuperação em breve.');
                setIsForgotPassword(false);
            } else if (isRegister) {
                // Validação de força de senha no front (eco do back)
                if (password.length < 8) {
                    setError('A senha deve ter pelo menos 8 caracteres.');
                    setIsLoading(false);
                    return;
                }
                if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
                    setError('A senha deve conter pelo menos letras e números.');
                    setIsLoading(false);
                    return;
                }
                if (!termsAccepted) {
                    setError('Você deve aceitar os Termos de Uso e a Política de Privacidade para criar uma conta.');
                    setIsLoading(false);
                    return;
                }

                const response = await api.post('/auth/register', { email, password, name, termsAccepted });

                // HttpOnly cookie já foi setado pelo backend.
                // Dados do usuário serão obtidos via /auth/me no App.tsx.
                if (response.data.user) {
                    // Redireciona pra verificação se email não verificado
                    if (!response.data.user.isEmailVerified) {
                        navigate('/verify-email');
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    setSuccessMsg(response.data.message || 'Cadastro realizado com sucesso!');
                    setIsRegister(false);
                }
            } else {
                await api.post('/auth/login', { email, password });
                // HttpOnly cookie já setado pelo backend.
                // Dados do usuário serão buscados via /auth/me.
                navigate('/dashboard');
            }
        } catch (err: any) {
            console.error(err);
            const msg = err.response?.data?.message || 'Erro ao realizar operação. Verifique sua conexão.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleMode = () => {
        setIsRegister(!isRegister);
        setError('');
        setSuccessMsg('');
        setTermsAccepted(false);
    };

    const switchToForgotPassword = () => {
        setIsForgotPassword(true);
        setError('');
        setSuccessMsg('');
    };

    const switchToLogin = () => {
        setIsForgotPassword(false);
    };

    return {
        isRegister,
        email,
        setEmail,
        password,
        setPassword,
        name,
        setName,
        termsAccepted,
        setTermsAccepted,
        error,
        successMsg,
        isLoading,
        isForgotPassword,
        handleSubmit,
        toggleMode,
        switchToForgotPassword,
        switchToLogin,
    };
}
