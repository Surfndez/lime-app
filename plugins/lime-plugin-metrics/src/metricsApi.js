export const getMetrics = (api, sid,params) => api.call(sid, 'lime-metrics', 'get_metrics', params)
	.map(result => Object.assign({}, result, { target: params.target })
	);

export const getAllMetrics = (api, sid, params) => params.targets.map(x => getMetrics(api,sid, { target: x }));

export const getGateway = (api, sid) => api.call(sid, 'lime-metrics', 'get_gateway', {})
	.map(result => result);

export const getPath = (api, sid, params) => api.call(sid, 'lime-metrics', 'get_path', params);

export const getLastKnownPath = (api, sid, params) => api.call(sid, 'lime-metrics', 'get_last_internet_path', params);