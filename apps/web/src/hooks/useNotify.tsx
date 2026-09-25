import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { Toast } from '../components/ui';

const NotifyContext = createContext<(message: string) => void>(() => undefined);

export function NotifyProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  const clear = useCallback(() => setMessage(''), []);
  return (
    <NotifyContext.Provider value={setMessage}>
      {children}
      {message && <Toast message={message} onDone={clear} />}
    </NotifyContext.Provider>
  );
}

export const useNotify = () => useContext(NotifyContext);
