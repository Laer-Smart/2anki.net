"""
Load template file
"""
import os

from .get_path_start import _path_start


def read_template(template_dir, path, fmt, value):
    """
    Read a file in the template directory.
    :param template_dir: users template directory
    :param path: file to read
    :param fmt: variable to replace in file
    :param value: value to use for replacement
    :return:
    """
    file_path = path if path.startswith(_path_start()) else os.path.join(template_dir, path)
    with open(file_path, "r", encoding="utf-8") as file:
        if fmt and value:
            return file.read().replace(fmt, value)
        return file.read()
