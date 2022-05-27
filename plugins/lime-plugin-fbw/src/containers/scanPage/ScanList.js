import { h } from 'preact';
import { useState, useEffect } from 'preact/hooks';

import style from '../../style.less';

import { Trans } from '@lingui/macro';
import { Loading } from 'components/loading';
import Toast from 'components/toast';
import { useGetNetworks, useSearchNetworks } from '../../FbwQueries';
import { List, ListItem } from 'components/list';

import { SignalBar } from 'components/signalbar';
import signalStyle from 'components/signalbar/style.less';
import { RescanButton, CancelButton } from './components/buttons';


export const ScanList = ({ 
	selectedNetwork, 
	setSetSelectedNetwork, 
	cancelSelectedNetwork, 
	cancel, 
}) => {

	const [status, setStatus] = useState()		// Scan status
	const [networks, setNetworks] = useState() 	// Configuration files downloaded
	const [scanned, setScanned] = useState([]) 	// Scanned AP's

	const [expandedAps, setExpandedAps] = useState([]) 	// Expand scanned lists

	const { data: payloadData } = useGetNetworks();

	const [searchNetworks, { isLoading: isSubmitting, isError: isSeachNetworkError }] = useSearchNetworks()

	/* Load scan results */
	function _rescan() {
		cancelSelectedNetwork()
		searchNetworks(true);
	}
	
	/* Change selectedNetwork after selectbox change event */
	function selectNetwork(netIdx) {
		const { config, file } = networks[netIdx];
		setSetSelectedNetwork({
			...selectedNetwork,
			file,
			apname: config.wifi.apname_ssid.split('/%H')[0],
			community: config.wifi.ap_ssid
		});

	}

	useEffect(() => {
		setStatus(payloadData?.status || null)
		setNetworks(payloadData?.networks || [])
		setScanned(payloadData?.scanned || [])
	}, [payloadData])

	useEffect(() => {
		let interval;
		if (status === 'scanned') return;
		else if (status === 'scanning') {
			interval = setInterval(() => {
				console.log('Key pulling the new status', status);
				searchNetworks(false);
			}, 2000);
		}
		else if (!status) {
			searchNetworks(false);
		}
		return () => {
			if (interval) clearInterval(interval);
		};
	}, [status, isSubmitting, searchNetworks]);

	
	const getNetworkFromBssid = (bssid) => {
		for (let i = 0; i < networks.length; i++) {
			if(networks[i].bssid === bssid) return {...networks[i], index: i}
		} 
		return ""
	}
	
	const NetworkBox = ({ station }) => {
		let network = getNetworkFromBssid(station.bssid);
		let hostname = network.ap; // Hostname got from config file
		let listKey =
		 station.bssid.replaceAll(":", "_"); // Used as key to expand the card
	
		const setExpanded = () => {
		  if (expandedAps.includes(listKey)) {
			setExpandedAps([...expandedAps.filter((v) => v !== listKey)]);
		  } else {
			setExpandedAps([...expandedAps, listKey]);
		  }
		};
	
		const statusMessage = () => {
			// console.debug(station.bssid, hostname)
		  // Case no scanned status or scanned is true but scan end
		  if ((station.status == null 
				|| (station?.status?.code === "downloaded_config" && hostname === undefined)
				|| (station?.status?.code === "downloading_config" )) 
				&& status === "scanned") {
			return (
			  <div class={`${style.fetchingName}`}>
				<Trans>Error reaching hostname!</Trans>
			  </div>
			);
		  }
		  // Case configuration download not started yet
		  else if (station.status == null) {
			return (
			  <div class={`${style.fetchingName} withLoadingEllipsis`}>
				<Trans>Connection attempt not yet started</Trans>
			  </div>
			);
		  }
		  // Case scan retval is false
		  else if (station.status.retval === false) {
			let msg;
			switch (station.status.code) {
			  case "error_download_lime_community":
				msg = <Trans>Error downloading lime community</Trans>;
				break;
			  case "error_not_configured":
				msg = (
				  <Trans>Error destination network is not configured yet</Trans>
				);
				break;
			  case "error_download_lime_assets":
				msg = <Trans>Error downloading lime assets</Trans>;
				break;
			}
			return <div class={`${style.fetchingName}`}>{msg}</div>;
		  }
		  // Case scan retval is true
		  else if (station.status.retval === true) {
			// Is downloading
			if (station.status.code == "downloading_config") {
			  return (
				<div class={`${style.fetchingName} withLoadingEllipsis`}>
				  <Trans>Fetching name</Trans>
				</div>
			  );
			}
			// Has hostname
			else if (station.status.code === "downloaded_config" && hostname) {
			  return (
				<span>
				  <div style={"font-size: 2rem;"}>{hostname}</div>
				  <div style={"font-size: 1.5rem; padding-right: 10px;"}>
					{`(${  network.config.wifi.ap_ssid  })`}
				  </div>
				</span>
			  );
			}
		  }
		  return (
			<div class={`${style.fetchingName}`}>
			  <Trans>Unknown error</Trans>
			</div>
		  );
		};
	
		return (
		  <ListItem
			onClick={setExpanded}
			style={"padding-left: 0.5em; padding-right:0.5em;"}
			key={listKey}
			data-testid={listKey}
		  >
			<div>
			  {
			  	statusMessage()
			  }
			  <div
				class={
				  expandedAps.includes(listKey)
					? style.itemActive
					: style.itemHidden
				}
			  >
				<div>{station.bssid}</div>
				<div>
				  <Trans>Channel</Trans>: {station.channel}
				</div>
			  </div>
			</div>
			<div class={`${style.netItemRight} d-flex`}>
			  {hostname && station?.status?.code == "downloaded_config" && (
				<button
				  onClick={() => {
					selectNetwork(network.index);
				  }}
				>
				  <Trans>Select</Trans>
				</button>
			  )}
	
			  <div class={signalStyle.signal} style={"margin-bottom:auto;"}>
				<div class="d-flex flex-grow-1 align-items-baseline">
				  <div>{station.signal}</div>
				</div>
				<SignalBar signal={station.signal} className={signalStyle.bar} />
			  </div>
			</div>
		  </ListItem>
		);
	  };
	

	const NetworksList = () =>{
		return (
			<List>
				{scanned.length > 0 &&
					<div class={style.assoclistHeader}><Trans>Choose a mesh node to join it's network:</Trans></div>
				}
				{scanned.length > 0 && 
					scanned.map(station => <NetworkBox key={station.mac} station={station} />
				)}
			</List>
		)
	}

	return (
		<div class="container container-padded">
			<div>
				<div>
					{ status === 'scanning' && !selectedNetwork.apname ? (<Loading />): false }
					{ scanned.length === 0 && status === 'scanned' ?
						<span>
							<h3 className="container-center">
								<Trans>No scan result</Trans>
							</h3>
							<div class="row">
								<div class="six columns"> 
									<RescanButton rescan={_rescan}  />
								</div>
								<div class="six columns"> 
									<CancelButton cancel={cancel} />
								</div>
							</div>
						</span>
					: false} 
					{ !selectedNetwork.apname ?
					(<span>
						<NetworksList /> 
						<div class="row">
							<div class="six columns"> 
								<RescanButton rescan={_rescan}  />
							</div>
							<div class="six columns"> 
								<CancelButton cancel={cancel} />
							</div>
						</div>
					</span>) : null }
				</div>
			</div>
			{isSeachNetworkError && <Toast text={<Trans>Error scanning networks</Trans>} />}
			{(status === 'scanning' && <Toast text={<Trans>Scanning for existing networks</Trans>} />)}
		</div>
	);
};
