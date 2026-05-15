from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, relationship
from geoalchemy2 import Geometry

Base = declarative_base()

class GridPoint(Base):
    __tablename__ = 'grid_points'

    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    geom = Column(Geometry(geometry_type='POINT', srid=4326))

    rainfall_series = relationship("RainfallSeries", back_populates="grid_point", cascade="all, delete")
    correlations = relationship("CorrelationResult", back_populates="grid_point", cascade="all, delete")


class AdministrativeDivision(Base):
    __tablename__ = 'administrative_divisions'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    country = Column(String, nullable=True)
    geom = Column(Geometry(geometry_type='POLYGON', srid=4326))
    
    correlations = relationship("CorrelationResult", back_populates="division", cascade="all, delete")



class RainfallSeries(Base):
    __tablename__ = 'rainfall_series'

    time = Column(DateTime(timezone=True), primary_key=True, nullable=False)
    region_id = Column(Integer, ForeignKey('grid_points.id', ondelete="CASCADE"), primary_key=True, nullable=False)
    rainfall = Column(Float, nullable=False)

    grid_point = relationship("GridPoint", back_populates="rainfall_series")

class CorrelationResult(Base):
    __tablename__ = 'correlation_results'

    id = Column(Integer, primary_key=True)
    region_id = Column(Integer, ForeignKey('grid_points.id', ondelete="CASCADE"), nullable=True) # Point-based ID (Nullable if it's a division)
    division_id = Column(Integer, ForeignKey('administrative_divisions.id', ondelete="CASCADE"), nullable=True) # Division-based ID
    corr = Column(Float, nullable=False)
    lag = Column(Integer, nullable=False)
    type = Column(String, nullable=False)
    intensity = Column(Float, nullable=False)

    grid_point = relationship("GridPoint", back_populates="correlations")
    division = relationship("AdministrativeDivision", back_populates="correlations")


class UserRegion(Base):
    __tablename__ = 'user_regions'

    id = Column(String, primary_key=True)
    name = Column(String)
    lat = Column(Float)
    lon = Column(Float)
    data = Column(String) # JSON string of the entire region object for flexibility

