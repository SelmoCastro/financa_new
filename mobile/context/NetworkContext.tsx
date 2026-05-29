import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

interface NetworkContextValue {
  isOnline: boolean;
  isConnected: boolean;
  isInternetReachable: boolean | null;
  lastChangedAt: number | null;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

function resolveOnline(state: NetInfoState) {
  return Boolean(state.isConnected) && state.isInternetReachable !== false;
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<NetworkContextValue>({
    isOnline: true,
    isConnected: true,
    isInternetReachable: null,
    lastChangedAt: null,
  });

  useEffect(() => {
    let mounted = true;

    NetInfo.fetch()
      .then((netState) => {
        if (!mounted) return;
        setState({
          isOnline: resolveOnline(netState),
          isConnected: Boolean(netState.isConnected),
          isInternetReachable: netState.isInternetReachable ?? null,
          lastChangedAt: Date.now(),
        });
      })
      .catch(() => {});

    const unsubscribe = NetInfo.addEventListener((netState) => {
      setState((prev) => ({
        ...prev,
        isOnline: resolveOnline(netState),
        isConnected: Boolean(netState.isConnected),
        isInternetReachable: netState.isInternetReachable ?? null,
        lastChangedAt: prev.isOnline === resolveOnline(netState) ? prev.lastChangedAt : Date.now(),
      }));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus() {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetworkStatus must be used within a NetworkProvider');
  }
  return context;
}
