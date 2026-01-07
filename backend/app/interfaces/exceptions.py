from fastapi import status


class ServiceException(Exception):
    def __init__(self, message: str = "Service error", status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)


class InvalidEmailOrPasswordError(ServiceException):
    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)


class UserAlreadyExistsError(ServiceException):
    def __init__(self, message: str = "User with this email already exists"):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)


class InvalidTokenError(ServiceException):
    def __init__(self, message: str = "Invalid token"):
        super().__init__(message, status_code=status.HTTP_401_UNAUTHORIZED)


class NotAuthorizedError(ServiceException):
    def __init__(self, message: str = "Not authorized to perform this action"):
        super().__init__(message, status_code=status.HTTP_403_FORBIDDEN)


class ApplicationAlreadyExists(ServiceException):
    def __init__(self, message: str = "Application already exists for this request"):
        super().__init__(message, status_code=status.HTTP_409_CONFLICT)


class NoRequestFoundError(ServiceException):
    def __init__(self, message: str = "No request found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class NoApplicationFoundError(ServiceException):
    def __init__(self, message: str = "No application found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class RequestNotOpen(ServiceException):
    def __init__(self, message: str = "Request is not open"):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


class CanNotDeleteApplicationError(ServiceException):
    def __init__(self, message: str = "Can not delete application"):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


class ApplicationCannotBeRated(ServiceException):
    def __init__(self, message: str = "Application cannot be rated"):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


class CanNotAcceptApplication(ServiceException):
    def __init__(self, message: str = "Can not accept application"):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


class UserNotFoundError(ServiceException):
    def __init__(self, message: str = "User not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class AIServiceUnavailableError(ServiceException):
    def __init__(self, message: str = "AI Service is unavailable"):
        super().__init__(message, status_code=status.HTTP_503_SERVICE_UNAVAILABLE)


class RequestNotFoundError(ServiceException):
    def __init__(self, message: str = "Request not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class RequestCannotBeUpdatedError(ServiceException):
    def __init__(self, message: str = "Request cannot be updated"):
        super().__init__(message, status_code=status.HTTP_400_BAD_REQUEST)


class QuestNotFoundError(ServiceException):
    def __init__(self, message: str = "Quest not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)


class BadgeNotFoundError(ServiceException):
    def __init__(self, message: str = "Badge not found"):
        super().__init__(message, status_code=status.HTTP_404_NOT_FOUND)
