import { combineReducers } from 'redux';
import { AlertTypes } from '../../shared/constants/alerts';
import confirmReducer from './confirm/confirm';
import metamaskReducer from './metamask/metamask';
import localeMessagesReducer from './locale/locale';
import sendReducer from './send/send';
import domainReducer from './domains';
import appStateReducer from './app/app';
import confirmTransactionReducer from './confirm-transaction/confirm-transaction.duck';
import gasReducer from './gas/gas.duck';
import { invalidCustomNetwork, unconnectedAccount } from './alerts';
import swapsReducer from './swaps/swaps';
import historyReducer from './history/history';
import rampsReducer from './ramps/ramps';
import confirmAlertsReducer from './confirm-alerts/confirm-alerts';

export default combineReducers({
  [AlertTypes.invalidCustomNetwork]: invalidCustomNetwork,
  [AlertTypes.unconnectedAccount]: unconnectedAccount,
  activeTab: (s) => (s === undefined ? null : s),
  metamask: metamaskReducer,
  appState: appStateReducer,
  DNS: domainReducer,
  history: historyReducer,
  send: sendReducer,
  confirm: confirmReducer,
  confirmAlerts: confirmAlertsReducer,
  confirmTransaction: confirmTransactionReducer,
  swaps: swapsReducer,
  ramps: rampsReducer,
  gas: gasReducer,
  localeMessages: localeMessagesReducer,
});
