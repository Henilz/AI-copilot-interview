import json
from typing import Any

import redis.asyncio as aioredis

from app.config import settings

_pool: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _pool
    if _pool is None:
        _pool = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _pool


async def redis_get(key: str) -> Any | None:
    r = get_redis()
    value = await r.get(key)
    if value is None:
        return None
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return value


async def redis_set(key: str, value: Any, ttl: int | None = None) -> None:
    r = get_redis()
    serialised = json.dumps(value) if not isinstance(value, str) else value
    if ttl:
        await r.set(key, serialised, ex=ttl)
    else:
        await r.set(key, serialised)


async def redis_delete(key: str) -> None:
    r = get_redis()
    await r.delete(key)


async def redis_rpush(key: str, *values: Any) -> None:
    r = get_redis()
    serialised = [json.dumps(v) if not isinstance(v, str) else v for v in values]
    await r.rpush(key, *serialised)


async def redis_lrange(key: str, start: int, end: int) -> list[Any]:
    r = get_redis()
    items = await r.lrange(key, start, end)
    result = []
    for item in items:
        try:
            result.append(json.loads(item))
        except (json.JSONDecodeError, TypeError):
            result.append(item)
    return result


async def redis_llen(key: str) -> int:
    r = get_redis()
    return await r.llen(key)


async def redis_publish(channel: str, message: Any) -> None:
    r = get_redis()
    serialised = json.dumps(message) if not isinstance(message, str) else message
    await r.publish(channel, serialised)


async def redis_incr(key: str) -> int:
    r = get_redis()
    return await r.incr(key)


async def redis_get_int(key: str) -> int:
    value = await redis_get(key)
    if value is None:
        return 0
    try:
        return int(value)
    except (ValueError, TypeError):
        return 0
