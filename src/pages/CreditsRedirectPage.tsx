import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const CreditsRedirectPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const open = params.get('open');
    const payment = params.get('payment');

    const state: any = {};

    if (open === 'purchase') {
      state.openPurchase = true;
    } else {
      state.openCredits = true;
    }

    if (payment) state.payment = payment;

    navigate('/profile', { replace: true, state });
  }, [location.search, navigate]);

  return null;
};

export default CreditsRedirectPage;
