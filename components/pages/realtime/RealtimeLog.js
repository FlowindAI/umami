import { useMemo, useState } from 'react';
import { StatusLight, Icon } from 'react-basics';
import { useIntl, FormattedMessage } from 'react-intl';
import { FixedSizeList } from 'react-window';
import firstBy from 'thenby';
import FilterButtons from 'components/common/FilterButtons';
import NoData from 'components/common/NoData';
import { getDeviceMessage, labels } from 'components/messages';
import useLocale from 'hooks/useLocale';
import useCountryNames from 'hooks/useCountryNames';
import { BROWSERS } from 'lib/constants';
import { stringToColor } from 'lib/format';
import { dateFormat } from 'lib/date';
import { safeDecodeURI } from 'next-basics';
import Icons from 'components/icons';
import styles from './RealtimeLog.module.css';

const TYPE_ALL = 'type-all';
const TYPE_PAGEVIEW = 'type-pageview';
const TYPE_SESSION = 'type-session';
const TYPE_EVENT = 'type-event';

const TYPE_ICONS = {
  [TYPE_PAGEVIEW]: <Icons.Eye />,
  [TYPE_SESSION]: <Icons.Visitor />,
  [TYPE_EVENT]: <Icons.Bolt />,
};

export default function RealtimeLog({ data, websiteDomain }) {
  const { formatMessage } = useIntl();
  const { locale } = useLocale();
  const countryNames = useCountryNames(locale);
  const [filter, setFilter] = useState(TYPE_ALL);

  const logs = useMemo(() => {
    if (!data) {
      return [];
    }

    const { pageviews, sessions, events } = data;
    const logs = [...pageviews, ...sessions, ...events].sort(firstBy('createdAt', -1));
    if (filter) {
      return logs.filter(row => getType(row) === filter);
    }
    return logs;
  }, [data, filter]);

  const uuids = useMemo(() => {
    if (!data) {
      return [];
    }

    return data.sessions.reduce((obj, { sessionId, sessionUuid }) => {
      obj[sessionId] = sessionUuid;
      return obj;
    }, {});
  }, [data]);

  const buttons = [
    {
      label: formatMessage(labels.all),
      key: TYPE_ALL,
    },
    {
      label: formatMessage(labels.views),
      key: TYPE_PAGEVIEW,
    },
    {
      label: formatMessage(labels.sessions),
      key: TYPE_SESSION,
    },
    {
      label: formatMessage(labels.events),
      key: TYPE_EVENT,
    },
  ];

  function getType({ pageviewId, sessionId, eventId }) {
    if (eventId) {
      return TYPE_EVENT;
    }
    if (pageviewId) {
      return TYPE_PAGEVIEW;
    }
    if (sessionId) {
      return TYPE_SESSION;
    }
    return null;
  }

  function getIcon(row) {
    return TYPE_ICONS[getType(row)];
  }

  function getDetail({
    eventName,
    pageviewId,
    sessionId,
    url,
    browser,
    os,
    country,
    device,
    websiteId,
  }) {
    if (eventName) {
      return <div>{eventName}</div>;
    }
    if (pageviewId) {
      return (
        <a
          className={styles.link}
          href={`//${websiteDomain}${url}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          {safeDecodeURI(url)}
        </a>
      );
    }
    if (sessionId) {
      return (
        <FormattedMessage
          id="message.log.visitor"
          defaultMessage="Visitor from {country} using {browser} on {os} {device}"
          values={{
            country: <b>{countryNames[country] || formatMessage(labels.unknown)}</b>,
            browser: <b>{BROWSERS[browser]}</b>,
            os: <b>{os}</b>,
            device: <b>{formatMessage(getDeviceMessage(device))}</b>,
          }}
        />
      );
    }
  }

  function getTime({ createdAt }) {
    return dateFormat(new Date(createdAt), 'pp', locale);
  }

  function getColor(row) {
    const { sessionId } = row;

    return stringToColor(uuids[sessionId] || `${sessionId}}`);
  }

  const Row = ({ index, style }) => {
    const row = logs[index];
    return (
      <div className={styles.row} style={style}>
        <div>
          <StatusLight color={getColor(row)} />
        </div>
        <div className={styles.time}>{getTime(row)}</div>
        <div className={styles.detail}>
          <Icon className={styles.icon} icon={getIcon(row)} />
          {getDetail(row)}
        </div>
      </div>
    );
  };

  return (
    <div className={styles.table}>
      <FilterButtons items={buttons} selectedKey={filter} onSelect={setFilter} />
      <div className={styles.header}>
        <FormattedMessage id="label.realtime-logs" defaultMessage="Realtime logs" />
      </div>
      <div className={styles.body}>
        {logs?.length === 0 && <NoData />}
        {logs?.length > 0 && (
          <FixedSizeList height={400} itemCount={logs.length} itemSize={40}>
            {Row}
          </FixedSizeList>
        )}
      </div>
    </div>
  );
}
