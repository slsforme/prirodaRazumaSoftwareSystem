import aiohttp
from dotenv import load_dotenv

import os 
from datetime import datetime


from config import logger

load_dotenv()

async def ensure_yandex_folder_exists(session: aiohttp.ClientSession, folder_path: str) -> None:
    check_url = "https://cloud-api.yandex.net/v1/disk/resources"
    params = {"path": folder_path}
    
    try:
        async with session.get(check_url, params=params) as response:
            if response.status == 200:
                logger.info(f"Папка {folder_path} уже существует")
                return
            elif response.status == 404:
                async with session.put(check_url, params=params) as create_response:
                    if create_response.status in [200, 201]:
                        logger.info(f"Папка {folder_path} успешно создана")
                        return
                    error = await create_response.text()
                    raise Exception(f"Ошибка создания папки: {create_response.status} - {error}")
            else:
                error = await response.text()
                raise Exception(f"Ошибка проверки папки: {response.status} - {error}")
    except aiohttp.ClientError as e:
        raise Exception(f"Сетевая ошибка при работе с папкой: {str(e)}")

async def get_files_list(session: aiohttp.ClientSession, folder_path: str) -> list:
    list_url = "https://cloud-api.yandex.net/v1/disk/resources"
    params = {
        "path": folder_path,
        "limit": 100,
        "sort": "-created"
    }
    
    async with session.get(list_url, params=params) as response:
        if response.status != 200:
            error = await response.text()
            raise Exception(f"Ошибка получения списка файлов: {response.status} - {error}")
        
        data = await response.json()
        return [item for item in data.get('_embedded', {}).get('items', []) 
                if item['type'] == 'file']

async def delete_old_files(session: aiohttp.ClientSession, folder_path: str, keep_count: int = 7) -> None:
    files = await get_files_list(session, folder_path)
    
    if len(files) <= keep_count:
        logger.info(f"В папке {folder_path} меньше {keep_count} файлов, удаление не требуется")
        return
    
    files_to_delete = files[keep_count:]
    logger.info(f"Найдено {len(files_to_delete)} файлов для удаления")
    
    delete_url = "https://cloud-api.yandex.net/v1/disk/resources"
    for file in files_to_delete:
        params = {"path": file['path'], "permanently": "true"}
        async with session.delete(delete_url, params=params) as response:
            if response.status == 204:
                logger.info(f"Удален файл: {file['name']}")
            else:
                error = await response.text()
                logger.error(f"Ошибка удаления {file['name']}: {response.status} - {error}")

async def async_upload_to_yandex_disk(local_path: str, remote_path: str) -> dict:
    token = os.getenv("YANDEX_API_TOKEN")
    headers = {
        'Authorization': f'OAuth {token}',
        'Accept': 'application/json'
    }
    
    async with aiohttp.ClientSession(headers=headers) as session:
        try:
            folder_path = os.path.dirname(remote_path)
            await ensure_yandex_folder_exists(session, folder_path)
            
            upload_url = 'https://cloud-api.yandex.net/v1/disk/resources/upload'
            params = {'path': remote_path, 'overwrite': 'true'}
            
            async with session.get(upload_url, params=params) as response:
                if response.status != 200:
                    error = await response.text()
                    raise Exception(f"Ошибка получения URL: {response.status} - {error}")
                
                upload_data = await response.json()
                put_url = upload_data['href']
            
            with open(local_path, 'rb') as f:
                file_content = f.read()
            
            async with session.put(put_url, data=file_content) as response:
                if response.status not in [200, 201]:
                    error = await response.text()
                    raise Exception(f"Ошибка загрузки: {response.status} - {error}")
                
            await delete_old_files(session, folder_path)
            
            return {
                'remote_path': remote_path,
                'size': os.path.getsize(local_path),
                'uploaded_at': datetime.now().isoformat()
            }
                
        except aiohttp.ClientError as e:
            raise Exception(f"Ошибка сети: {str(e)}")