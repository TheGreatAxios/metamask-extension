import { InternalAccount, isEvmAccountType } from '@metamask/keyring-api';
import { ProviderConfig } from '@metamask/network-controller';
import type { RatesControllerState } from '@metamask/assets-controllers';
import {
  CaipChainId,
  KnownCaipNamespace,
  parseCaipChainId,
} from '@metamask/utils';
import { ChainId } from '@metamask/controller-utils';
import {
  MultichainProviderConfig,
  MULTICHAIN_PROVIDER_CONFIGS,
  MultichainNetworks,
} from '../../shared/constants/multichain/networks';
import {
  getCompletedOnboarding,
  getConversionRate,
  getNativeCurrency,
  getProviderConfig,
} from '../ducks/metamask/metamask';
import { BalancesControllerState } from '../../app/scripts/lib/accounts/BalancesController';
import { AccountsState } from './accounts';
import {
  getAllNetworks,
  getCurrentChainId,
  getCurrentCurrency,
  getIsMainnet,
  getMaybeSelectedInternalAccount,
  getNativeCurrencyImage,
  getSelectedInternalAccount,
  getShouldShowFiat,
} from '.';

export type RatesState = {
  metamask: RatesControllerState;
};

export type BalancesState = {
  metamask: BalancesControllerState;
};

export type MultichainState = AccountsState & RatesState & BalancesState;

export type MultichainNetwork = {
  nickname: string;
  isEvmNetwork: boolean;
  chainId?: CaipChainId;
  network: ProviderConfig | MultichainProviderConfig;
};

export function getMultichainNetworkProviders(
  _state: MultichainState,
): MultichainProviderConfig[] {
  // TODO: need state from the ChainController?
  return Object.values(MULTICHAIN_PROVIDER_CONFIGS);
}

export function getMultichainNetwork(
  state: MultichainState,
  account?: InternalAccount,
): MultichainNetwork {
  const isEvm = getMultichainIsEvm(state, account);

  // EVM networks
  const evmNetworks: ProviderConfig[] = getAllNetworks(state);
  const evmChainId: ChainId = getCurrentChainId(state);

  if (isEvm) {
    const evmNetwork: ProviderConfig =
      evmNetworks.find((provider) => provider.chainId === evmChainId) ??
      getProviderConfig(state); // We fallback to the original selector otherwise

    return {
      nickname: 'Ethereum',
      isEvmNetwork: true,
      // We assume the chain ID is `string` or `number`, so we convert it to a
      // `Number` to be compliant with EIP155 CAIP chain ID
      chainId: `${KnownCaipNamespace.Eip155}:${Number(
        evmChainId,
      )}` as CaipChainId,
      network: evmNetwork,
    };
  }

  // Non-EVM networks:
  // (Hardcoded for testing)
  // HACK: For now, we rely on the account type being "sort-of" CAIP compliant, so use
  // this as a CAIP-2 namespace and apply our filter with it
  // For non-EVM, we know we have a selected account, since the logic `isEvm` is based
  // on having a non-EVM account being selected!
  const selectedAccount = account ?? getSelectedInternalAccount(state);
  const nonEvmNetworks = getMultichainNetworkProviders(state);
  const nonEvmNetwork = nonEvmNetworks.find((provider) => {
    const { namespace } = parseCaipChainId(provider.chainId);
    return selectedAccount.type.startsWith(namespace);
  });

  if (!nonEvmNetwork) {
    throw new Error(
      'Could not find non-EVM provider for the current configuration. This should never happen.',
    );
  }

  return {
    // TODO: Adapt this for other non-EVM networks
    // TODO: We need to have a way of setting nicknames of other non-EVM networks
    nickname: 'Bitcoin',
    isEvmNetwork: false,
    // FIXME: We should use CAIP-2 chain ID here, and not only the reference part
    chainId: nonEvmNetwork?.chainId,
    network: nonEvmNetwork,
  };
}

// FIXME: All the following might have side-effect, like if the current account is a bitcoin one and that
// a popup (for ethereum related stuffs) is being shown (and uses this function), then the native
// currency will be BTC..

export function getMultichainIsEvm(
  state: MultichainState,
  account?: InternalAccount,
) {
  const isOnboarded = getCompletedOnboarding(state);
  // Selected account is not available during onboarding (this is used in
  // the AppHeader)
  const selectedAccount = account ?? getMaybeSelectedInternalAccount(state);

  // There are no selected account during onboarding. we default to the original EVM behavior.
  return (
    !isOnboarded || !selectedAccount || isEvmAccountType(selectedAccount.type)
  );
}

/**
 * Retrieves the provider configuration for a multichain network.
 *
 * This function extracts the `network` field from the result of `getMultichainNetwork(state)`,
 * which is expected to be a `MultichainProviderConfig` object. The naming might suggest that
 * it returns a network, but it actually returns a provider configuration specific to a multichain setup.
 *
 * @param state - The redux state.
 * @param account - The multichain account.
 * @returns The current multichain provider configuration.
 */
export function getMultichainProviderConfig(
  state: MultichainState,
  account?: InternalAccount,
) {
  return getMultichainNetwork(state, account).network;
}

export function getMultichainCurrentNetwork(state: MultichainState) {
  return getMultichainProviderConfig(state);
}

export function getMultichainNativeCurrency(
  state: MultichainState,
  account?: InternalAccount,
) {
  return getMultichainIsEvm(state, account)
    ? getNativeCurrency(state)
    : getMultichainProviderConfig(state, account).ticker;
}

export function getMultichainCurrentCurrency(state: MultichainState) {
  const currentCurrency = getCurrentCurrency(state);

  if (getMultichainIsEvm(state)) {
    return currentCurrency;
  }

  // For non-EVM:
  // To mimic `getCurrentCurrency` we only consider fiat values, otherwise we
  // fallback to the current ticker symbol value
  return currentCurrency && currentCurrency.toLowerCase() === 'usd'
    ? 'usd'
    : getMultichainProviderConfig(state).ticker;
}

export function getMultichainCurrencyImage(
  state: MultichainState,
  account?: InternalAccount,
) {
  if (getMultichainIsEvm(state, account)) {
    return getNativeCurrencyImage(state);
  }

  const provider = getMultichainProviderConfig(
    state,
    account,
  ) as MultichainProviderConfig;
  return provider.rpcPrefs?.imageUrl;
}

export function getMultichainNativeCurrencyImage(
  state: MultichainState,
  account?: InternalAccount,
) {
  return getMultichainCurrencyImage(state, account);
}

export function getMultichainShouldShowFiat(
  state: MultichainState,
  account?: InternalAccount,
) {
  return getMultichainIsEvm(state, account)
    ? getShouldShowFiat(state)
    : // For now we force this for non-EVM
      true;
}

export function getMultichainDefaultToken(state: MultichainState) {
  const symbol = getMultichainIsEvm(state)
    ? // We fallback to 'ETH' to keep original behavior of `getSwapsDefaultToken`
      getProviderConfig(state).ticker ?? 'ETH'
    : getMultichainProviderConfig(state).ticker;

  return { symbol };
}

export function getMultichainCurrentChainId(state: MultichainState) {
  const { chainId } = getMultichainProviderConfig(state);
  return chainId;
}

export function getMultichainIsMainnet(state: MultichainState) {
  const chainId = getMultichainCurrentChainId(state);
  return getMultichainIsEvm(state)
    ? getIsMainnet(state)
    : // TODO: For now we only check for bitcoin mainnet, but we will need to
      // update this for other non-EVM networks later!
      chainId === MultichainNetworks.BITCOIN;
}

export function getMultichainBalances(state: MultichainState) {
  return state.metamask.balances;
}

export const getMultichainCoinRates = (state: MultichainState) => {
  return state.metamask.rates;
};

export function getMultichainConversionRate(
  state: MultichainState,
  account?: InternalAccount,
) {
  const { ticker } = getMultichainProviderConfig(state, account);

  return getMultichainIsEvm(state, account)
    ? getConversionRate(state)
    : getMultichainCoinRates(state)?.[ticker.toLowerCase()]?.conversionRate;
}
